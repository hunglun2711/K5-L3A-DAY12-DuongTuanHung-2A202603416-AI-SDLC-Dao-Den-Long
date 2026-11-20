"""Soak test runner for Đảo Đèn Lồng (Contract v1.3)."""

from __future__ import annotations

import argparse
import gc
import json
import math
import os
import random
import sys
import time
from pathlib import Path

from src.sim import GameSim, load_contract


def _rss_mb() -> float:
    try:
        import psutil
        return round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 2)
    except Exception:
        try:
            import resource
            val = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            # macOS returns bytes, Linux returns KiB
            return round(val / (1024 * 1024) if sys.platform == "darwin" else val / 1024, 2)
        except Exception:
            return 0.0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng Soak Test (Contract v1.3)")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--nights", type=int, default=10)
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args(argv)

    contract = load_contract()
    t_start = time.perf_counter()
    results: list[str] = []
    crashes = 0
    mem_start_mb = 0.0
    mem_end_mb = 0.0

    for i in range(args.nights):
        night = (i % 3) + 1
        seed_i = args.seed + i
        rng = random.Random(seed_i)
        try:
            sim = GameSim(seed=seed_i, night=night, contract=contract)
            if i == 0:
                mem_start_mb = _rss_mb()

            max_ticks = int(contract["tuning"][f"night{night}_duration_s"]) * 60 + 60
            move = [0.0, 0.0]
            for k in range(max_ticks):
                if sim.state in ("won", "lost"):
                    break
                if k % 30 == 0:
                    ang = rng.uniform(0.0, 2.0 * math.pi)
                    move = [math.cos(ang), math.sin(ang)]
                patch = {
                    "move": move,
                    "jump": rng.random() < 0.05,
                    "dash": rng.random() < 0.03,
                    "pulse": rng.random() < 0.02,
                    "interact": rng.random() < 0.10,
                }
                sim.step(patch)
            results.append(sim.state if sim.state in ("won", "lost") else "lost")
            del sim
            gc.collect()
        except Exception as exc:
            crashes += 1
            results.append("crash")
            print(f"Night {i} crashed: {exc}", file=sys.stderr)

    mem_end_mb = _rss_mb()
    duration_s = round(time.perf_counter() - t_start, 2)
    payload = {
        "nights": args.nights,
        "crashes": crashes,
        "results": results,
        "mem_start_mb": mem_start_mb,
        "mem_end_mb": mem_end_mb,
        "duration_s": duration_s,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0 if crashes == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
