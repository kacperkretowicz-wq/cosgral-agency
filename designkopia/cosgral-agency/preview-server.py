#!/usr/bin/env python3
"""Static preview with SEOHOST-like /portfolio → portfolio.html redirect."""
from __future__ import annotations

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "4173"))

REDIRECTS = {
    "/portfolio": "/portfolio.html",
    "/portfolio/": "/portfolio.html",
    "/o-nas": "/o-nas.html",
    "/o-nas/": "/o-nas.html",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _redirect_target(self):
        parts = urlsplit(self.path)
        return REDIRECTS.get(parts.path)

    def _send_redirect(self):
        target = self._redirect_target()
        if not target:
            return False
        parts = urlsplit(self.path)
        loc = target
        if parts.query:
            loc += "?" + parts.query
        self.send_response(301)
        self.send_header("Location", loc)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        return True

    # ——— Zadania zakresowe (HTTP Range) ———
    # SimpleHTTPRequestHandler ich nie obsluguje: na kazde zadanie oddaje caly
    # plik z kodem 200. Netlify obsluguje, wiec bez tego lokalny podglad
    # zachowuje sie inaczej niz produkcja — przegladarka pobiera KAZDY film
    # w calosci (2,9 MB zamiast kilku kB) i nie da sie sprawdzic, czy wideo
    # faktycznie laduje sie leniwie. Odtwarzacz wideo tez potrzebuje Range,
    # zeby przewijac bez pobierania calosci.
    def _try_range(self):
        rng = self.headers.get("Range")
        if not rng or not rng.startswith("bytes="):
            return False

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return False

        size = os.path.getsize(path)
        spec = rng[len("bytes=") :].split(",")[0].strip()
        start_s, _, end_s = spec.partition("-")
        try:
            if start_s:
                start = int(start_s)
                end = int(end_s) if end_s else size - 1
            else:
                # forma "bytes=-N" — ostatnie N bajtow
                if not end_s:
                    return False
                start = max(0, size - int(end_s))
                end = size - 1
        except ValueError:
            return False

        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return True

        end = min(end, size - 1)
        length = end - start + 1

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()

        with open(path, "rb") as fh:
            fh.seek(start)
            pozostalo = length
            while pozostalo > 0:
                kawalek = fh.read(min(64 * 1024, pozostalo))
                if not kawalek:
                    break
                self.wfile.write(kawalek)
                pozostalo -= len(kawalek)
        return True

    def do_GET(self):
        if self._send_redirect():
            return
        try:
            if self._try_range():
                return
        except (BrokenPipeError, ConnectionResetError):
            # przegladarka potrafi urwac polaczenie, gdy ma juz dosc bufora
            return
        return super().do_GET()

    def do_HEAD(self):
        if self._send_redirect():
            return
        return super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        if "Accept-Ranges" not in self._headers_buffer_names():
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def _headers_buffer_names(self):
        bufor = getattr(self, "_headers_buffer", None) or []
        return [
            wiersz.decode("latin-1").split(":", 1)[0]
            for wiersz in bufor
            if b":" in wiersz
        ]


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Preview: http://127.0.0.1:{PORT}/  (root={ROOT})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
