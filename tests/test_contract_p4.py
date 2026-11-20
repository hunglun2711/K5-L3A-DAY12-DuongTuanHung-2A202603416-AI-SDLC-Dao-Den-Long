"""Phase 4 tests: Contract v1.3, Soak test, and Local Leaderboard."""

import json
import subprocess
import sys
from pathlib import Path

from src.leaderboard import add_entry, export_leaderboard
from src.sim import load_contract


def test_contract_v1_3_schema():
    c = load_contract()
    assert c["contract_version"] == "1.3"
    assert "bench_cmd" in c
    assert "soak_cmd" in c


def test_leaderboard_ordering_and_export(tmp_path: Path):
    lb_path = tmp_path / "lb.json"
    add_entry("Alice", 500, 2, 1, achieved_at="2026-11-20T10:00:00+07:00", path=lb_path)
    add_entry("Bob", 800, 3, 2, achieved_at="2026-11-20T10:05:00+07:00", path=lb_path)
    add_entry("Charlie", 800, 3, 3, achieved_at="2026-11-20T09:50:00+07:00", path=lb_path)
    out_file = tmp_path / "export.json"
    export_leaderboard(out_file, src_path=lb_path)
    data = json.loads(out_file.read_text(encoding="utf-8"))
    names = [e["name"] for e in data["entries"]]
    assert names == ["Charlie", "Bob", "Alice"]  # Tie-break earlier timestamp first


def test_soak_3_nights_no_crash(tmp_path: Path):
    out = tmp_path / "soak.json"
    res = subprocess.run(
        [sys.executable, "-m", "src.soak", "--seed", "7", "--nights", "3", "--out", str(out)],
        check=False,
    )
    assert res.returncode == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["nights"] == 3
    assert data["crashes"] == 0
    assert len(data["results"]) == 3
