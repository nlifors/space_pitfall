#!/usr/bin/env python3
"""Tiny static dev server that disables caching.

`python3 -m http.server` lets the browser cache the ES modules, so edits don't
show up on a normal reload. This server sends no-store headers so a plain
refresh always runs the latest code.

Usage:  python3 serve.py [port]   # default port 8000  ->  http://localhost:8000
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Space Pitfall dev server (no cache) -> http://localhost:{port}")
    print("Press Ctrl+C to stop.")
    try:
        HTTPServer(("", port), NoCacheHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
