"""Headless CLI runner conforming to Test Contract v1.0."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from src.sim import GameSim, load_contract


def _err(msg: str, code: int = 1) -> int:
    print(f"Error: {msg}", file=sys.stderr)
    return code


def parse_inputs(path: str | Path) -> dict[int, dict[str, Any]]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise ValueError(f"Invalid inputs JSON: {exc}") from exc

    if not isinstance(data, dict) or "frames" not in data or not isinstance(data["frames"], list):
        raise ValueError("Inputs JSON must contain a 'frames' list")

    frames_by_tick: dict[int, dict[str, Any]] = {}
    last_tick = -1
    for frame in data["frames"]:
        if not isinstance(frame, dict) or "tick" not in frame:
            raise ValueError("Each frame must be an object with 'tick'")
        t = frame["tick"]
        if not isinstance(t, int) or t < 0 or t <= last_tick:
            raise ValueError(f"Frame ticks must be strictly increasing non-negative integers (got {t} after {last_tick})")
        last_tick = t
        if "move" in frame:
            mv = frame["move"]
            if not isinstance(mv, list) or len(mv) != 2:
                raise ValueError("'move' must be a 2-element list [x, z]")
        frames_by_tick[t] = frame
    return frames_by_tick


def parse_scenario(path: str | Path) -> dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise ValueError(f"Invalid scenario JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("Scenario JSON must be an object")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Đảo Đèn Lồng Headless Runner (Test Contract v1.0)")
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--night", type=int, required=True)
    parser.add_argument("--scenario", type=str, default=None)
    parser.add_argument("--inputs", type=str, default=None)
    parser.add_argument("--ticks", type=int, required=True)
    parser.add_argument("--out", type=str, required=True)
    parser.add_argument("--snapshot-every", type=int, default=10)

    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if exc.code is not None else 1

    if args.night != 1:
        return _err(f"Unsupported night {args.night} in Phase 1", 1)
    if args.ticks < 0:
        return _err("--ticks must be >= 0", 1)
    if args.snapshot_every <= 0:
        return _err("--snapshot-every must be > 0", 1)

    try:
        contract = load_contract()
    except Exception as exc:
        return _err(f"Cannot load game.contract.json: {exc}", 1)

    scenario_data: dict[str, Any] | None = None
    if args.scenario:
        try:
            scenario_data = parse_scenario(args.scenario)
        except ValueError as exc:
            return _err(str(exc), 2)

    frames_by_tick: dict[int, dict[str, Any]] = {}
    if args.inputs:
        try:
            frames_by_tick = parse_inputs(args.inputs)
        except ValueError as exc:
            return _err(str(exc), 2)

    sim = GameSim(seed=args.seed, night=args.night, contract=contract, scenario=scenario_data)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    lines: list[str] = []
    # Tick 0 snapshot before any input
    lines.append(json.dumps(sim.snapshot(), separators=(",", ":")))

    for k in range(args.ticks):
        if sim.state != "playing":
            break
        events = sim.step(frames_by_tick.get(k))
        for ev in events:
            lines.append(json.dumps(ev, separators=(",", ":")))
        if sim.tick % args.snapshot_every == 0:
            lines.append(json.dumps(sim.snapshot(), separators=(",", ":")))
        if sim.state != "playing":
            break

    lines.append(json.dumps({
        "type": "end",
        "ticks": sim.tick,
        "state": sim.state,
        "score": sim.score,
    }, separators=(",", ":")))

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
