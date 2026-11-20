"""HTTP server & CLI entry point for Đảo Đèn Lồng (Contract v1.3)."""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path
from typing import Any

from src.leaderboard import add_entry, export_leaderboard, load_leaderboard

ROOT_DIR = Path(__file__).resolve().parent.parent


class GameHandler(http.server.SimpleHTTPRequestHandler):
    bench_callback: Any = None

    def _send_json(self, code: int, obj: Any) -> None:
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/game.contract.json":
            data = (ROOT_DIR / "game.contract.json").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path == "/api/leaderboard":
            self._send_json(200, {"entries": load_leaderboard()})
            return
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        if self.path == "/api/leaderboard":
            try:
                entries = add_entry(
                    name=str(payload.get("name", "")),
                    score=int(payload.get("score", 0)),
                    nights_won=int(payload.get("nights_won", 0)),
                    seed=int(payload.get("seed", 0)),
                )
                self._send_json(200, {"entries": entries})
            except ValueError as exc:
                self._send_json(400, {"error": str(exc)})
            return

        if self.path == "/api/bench-done" and callable(self.bench_callback):
            self.bench_callback(payload)
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "Not found"})

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng Server (Contract v1.3)")
    parser.add_argument("--export-leaderboard", type=str, default=None)
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    args = parser.parse_args(argv)

    if args.export_leaderboard:
        export_leaderboard(args.export_leaderboard)
        return 0

    web_dir = str(ROOT_DIR / "web")
    handler = functools.partial(GameHandler, directory=web_dir)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        url = f"http://127.0.0.1:{args.port}"
        print(f"Đảo Đèn Lồng 3D đang chạy tại: {url}")
        print("Nhấn Ctrl+C để dừng server.")
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng server.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
