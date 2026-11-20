"""Simple cross-platform HTTP server for Đảo Đèn Lồng 3D Web UI."""

from __future__ import annotations

import functools
import http.server
import os
import socketserver
import threading
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/game.contract.json":
            contract_path = ROOT_DIR / "game.contract.json"
            data = contract_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    port = int(os.environ.get("PORT", "8080"))
    web_dir = str(ROOT_DIR / "web")
    handler = functools.partial(GameHandler, directory=web_dir)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        url = f"http://127.0.0.1:{port}"
        print(f"Đảo Đèn Lồng 3D đang chạy tại: {url}")
        print("Nhấn Ctrl+C để dừng server.")
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng server.")


if __name__ == "__main__":
    main()
