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
    "/privacy-policy": "/privacy-policy.html",
    "/privacy-policy/": "/privacy-policy.html",
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

    def do_GET(self):
        if self._send_redirect():
            return
        return super().do_GET()

    def do_HEAD(self):
        if self._send_redirect():
            return
        return super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Preview: http://127.0.0.1:{PORT}/  (root={ROOT})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
