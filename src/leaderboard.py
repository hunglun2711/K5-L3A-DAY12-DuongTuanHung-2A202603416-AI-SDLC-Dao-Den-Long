"""Local persistent leaderboard for Đảo Đèn Lồng (Contract v1.3)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_LB_PATH = Path(__file__).resolve().parent.parent / "data" / "leaderboard.json"
NAME_RE = re.compile(r"^[A-Za-z0-9_]{3,12}$")


def load_leaderboard(path: Path = DEFAULT_LB_PATH) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = data.get("entries", [])
        return entries if isinstance(entries, list) else []
    except Exception:
        return []


def save_leaderboard(entries: list[dict[str, Any]], path: Path = DEFAULT_LB_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"entries": entries}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def add_entry(
    name: str,
    score: int,
    nights_won: int,
    seed: int,
    achieved_at: str | None = None,
    path: Path = DEFAULT_LB_PATH,
) -> list[dict[str, Any]]:
    clean_name = name.strip()
    if not NAME_RE.match(clean_name):
        raise ValueError("Tên phải dài 3-12 ký tự [A-Za-z0-9_]")
    ts = achieved_at or datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    entries = load_leaderboard(path)
    entries.append({
        "name": clean_name,
        "score": int(score),
        "nights_won": max(0, min(3, int(nights_won))),
        "achieved_at": ts,
        "seed": int(seed),
    })
    entries.sort(key=lambda e: (-int(e["score"]), str(e["achieved_at"])))
    entries = entries[:10]
    save_leaderboard(entries, path)
    return entries


def export_leaderboard(out_path: str | Path, src_path: Path = DEFAULT_LB_PATH) -> None:
    entries = load_leaderboard(src_path)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"entries": entries}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
