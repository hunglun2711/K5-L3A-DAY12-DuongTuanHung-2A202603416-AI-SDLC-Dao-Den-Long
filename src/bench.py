"""Benchmark runner for Đảo Đèn Lồng (Contract v1.3)."""

from __future__ import annotations

import argparse
import functools
import json
import platform
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

from src.server import GameHandler, ROOT_DIR


def _find_browser() -> str | None:
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome", "msedge"):
        p = shutil.which(name)
        if p:
            return p
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng Benchmark (Contract v1.3)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--duration", type=float, default=30.0)
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args(argv)

    browser = _find_browser()
    if not browser:
        print("Error: No Chromium/Chrome/Edge browser found for 1280x720 WebGL benchmark.", file=sys.stderr)
        return 1

    done_ev = threading.Event()
    result_box: dict[str, Any] = {}

    class BenchHandler(GameHandler):
        @staticmethod
        def bench_callback(payload: dict[str, Any]) -> None:
            result_box.update(payload)
            done_ev.set()

    web_dir = str(ROOT_DIR / "web")
    handler = functools.partial(BenchHandler, directory=web_dir)
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]
        srv_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        srv_thread.start()

        t_proc_start = time.perf_counter()
        tmp_dir = tempfile.mkdtemp(prefix="ddl_bench_")
        url = f"http://127.0.0.1:{port}/?bench=1&seed={args.seed}&duration={args.duration}"
        cmd = [
            browser,
            f"--app={url}",
            "--window-size=1280,720",
            "--disable-gpu-vsync",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={tmp_dir}",
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        peak_mem_mb: float | None = None
        try:
            import psutil
            ps_proc = psutil.Process(proc.pid)
        except Exception:
            ps_proc = None

        deadline = time.perf_counter() + args.duration + 30.0
        while not done_ev.is_set() and time.perf_counter() < deadline:
            if ps_proc is not None:
                try:
                    rss = ps_proc.memory_info().rss
                    for ch in ps_proc.children(recursive=True):
                        rss += ch.memory_info().rss
                    mb = round(rss / (1024 * 1024), 1)
                    if peak_mem_mb is None or mb > peak_mem_mb:
                        peak_mem_mb = mb
                except Exception:
                    pass
            done_ev.wait(0.25)

        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        httpd.shutdown()
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if not done_ev.is_set():
        print("Error: Benchmark timed out waiting for browser result.", file=sys.stderr)
        return 1

    # Compute load_ms from process start if not already set
    load_ms = int(result_box.get("load_ms", round((time.perf_counter() - t_proc_start) * 1000)))
    output = {
        "contract_version": "1.3",
        "avg_fps": round(float(result_box.get("avg_fps", 0.0)), 1),
        "p1_low_fps": round(float(result_box.get("p1_low_fps", 0.0)), 1),
        "frame_ms_p95": round(float(result_box.get("frame_ms_p95", 0.0)), 1),
        "frames": int(result_box.get("frames", 0)),
        "load_ms": load_ms,
        "peak_mem_mb": peak_mem_mb,
        "vsync_off": True,
        "renderer": str(result_box.get("renderer", "Three.js r160 WebGL2")),
        "os": platform.platform(),
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
