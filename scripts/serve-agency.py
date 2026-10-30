#!/usr/bin/env python3
"""Local COSGRAL static server with gzip and byte ranges for inline video."""
import argparse
import gzip
import io
import re
import shutil
from functools import lru_cache, partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


@lru_cache(maxsize=32)
def compressed(path, modified_ns, size):
    return gzip.compress(Path(path).read_bytes(), compresslevel=6, mtime=0)


class PreviewServer(ThreadingHTTPServer):
    # Startup requests many assets at once, including WebGL modules.
    request_queue_size = 128


class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        if not path.is_file():
            return super().send_head()
        stat = path.stat()
        mime = self.guess_type(str(path))
        requested = self.headers.get('Range')
        # Only media needs ranges. Text compression is cached after its first request.
        if requested and mime.startswith(('video/', 'audio/')):
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
            try:
                if not match or not any(match.groups()):
                    raise ValueError()
                left, right = match.groups()
                start = int(left) if left else max(0, stat.st_size - int(right))
                end = min(int(right), stat.st_size - 1) if left and right else stat.st_size - 1
                if start > end or start >= stat.st_size:
                    raise ValueError()
            except ValueError:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{stat.st_size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            stream = path.open('rb')
            stream.seek(start)
            self.byte_range = end - start + 1
            self.send_response(206)
            self.send_header('Content-Type', mime)
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Range', f'bytes {start}-{end}/{stat.st_size}')
            self.send_header('Content-Length', str(self.byte_range))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return stream
        text = mime.startswith('text/') or mime in ('application/javascript', 'application/json', 'image/svg+xml')
        encodings = self.headers.get('Accept-Encoding', '')
        wants_gzip = any(part.strip().split(';')[0] == 'gzip' and not re.search(r';\s*q=0(?:\.0*)?(?:;|$)', part) for part in encodings.split(','))
        if text and wants_gzip and 1024 <= stat.st_size <= 4 * 1024 * 1024:
            etag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}-gzip"'
            if self.headers.get('If-None-Match') == etag:
                self.send_response(304)
                self.send_header('ETag', etag)
                self.send_header('Vary', 'Accept-Encoding')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                return None
            data = compressed(str(path), stat.st_mtime_ns, stat.st_size)
            self.send_response(200)
            self.send_header('ETag', etag)
            self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
            self.send_header('Content-Type', mime)
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return io.BytesIO(data)
        return super().send_head()

    def copyfile(self, source, outputfile):
        remaining = self.byte_range
        try:
            if remaining is None:
                shutil.copyfileobj(source, outputfile)
            else:
                while remaining:
                    chunk = source.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    outputfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Browsers cancel warm loads when users scroll past a video.

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / 'designkopia/cosgral-agency'
    server = PreviewServer((args.bind, args.port), partial(Handler, directory=str(root)))
    print(f'Serving COSGRAL on {args.bind}:{args.port} with gzip and video ranges', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
