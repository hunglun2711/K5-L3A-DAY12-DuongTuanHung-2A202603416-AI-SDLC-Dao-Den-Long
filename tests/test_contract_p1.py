"""Phase 1 regression tests updated for Ticket-02 standard tuning (Contract v1.1)."""

import json
import subprocess
import sys
from pathlib import Path

from src.sim import GameSim, load_contract


def test_contract_schema():
    c = load_contract()
    assert c["contract_version"] == "1.1"
    assert c["tuning"]["lantern_count_night1"] == 5
    assert c["tuning"]["lantern_cost"] == 10
    assert c["tuning"]["carry_capacity"] == 10
    assert c["tuning"]["night1_duration_s"] == 300
    assert "dash_speed" in c["tuning"]


def test_tick_model_and_camera_yaw_movement():
    sc = {"random_motes": False, "random_shades": False, "motes": [], "shades": []}
    sim = GameSim(seed=1, scenario=sc)
    assert sim.snapshot()["tick"] == 0
    sim.step({"move": [0, 1], "cam_yaw_deg": 90})
    snap = sim.snapshot()
    assert snap["tick"] == 1
    assert snap["sim_tick"] == 1
    assert snap["player"]["pos"][0] > 0.09
    assert abs(snap["player"]["pos"][2]) < 1e-3


def test_move_vector_clamped_to_unit_length():
    sc = {"random_motes": False, "random_shades": False, "motes": [], "shades": []}
    sim1 = GameSim(seed=1, scenario=sc)
    sim2 = GameSim(seed=1, scenario=sc)
    for _ in range(60):
        sim1.step({"move": [1, 1], "cam_yaw_deg": 0})
        sim2.step({"move": [1 / (2**0.5), 1 / (2**0.5)], "cam_yaw_deg": 0})
    assert sim1.snapshot()["player"]["pos"] == sim2.snapshot()["player"]["pos"]


def test_pickup_deposit_and_win():
    # Updated for Ticket-02: lantern_cost=10, carry_capacity=10
    sc = {
        "random_motes": False,
        "random_shades": False,
        "motes": [[0, 0, 1 + i * 0.2] for i in range(10)],
        "shades": [],
        "lanterns": [
            {"id": "L1", "lit": True, "deposited": 10},
            {"id": "L2", "lit": True, "deposited": 10},
            {"id": "L3", "lit": True, "deposited": 10},
            {"id": "L4", "lit": True, "deposited": 10},
            {"id": "L5", "pos": [0, 0, 4], "deposited": 0},
        ],
    }
    sim = GameSim(seed=1, scenario=sc)
    assert sim.score == 0
    all_events = []
    for k in range(40):
        patch = {"move": [0, 1]} if k == 0 else None
        all_events.extend(sim.step(patch))
    assert sim.carried == 10
    all_events.extend(sim.step({"move": [0, 0], "interact": True}))
    names = [e["name"] for e in all_events]
    assert "mote_picked" in names
    assert "deposit" in names
    assert "lantern_lit" in names
    assert "game_over" in names
    assert sim.state == "won"


def test_pulse_stuns_pushes_and_lit_lantern_safe_radius():
    # Updated for Ticket-02: pulse_cost=3, pulse_push_m=4 over 15 ticks, safe_radius=6.0
    sc = {
        "random_motes": False,
        "random_shades": False,
        "player": {"pos": [0, 0, 0], "carried": 3, "flames": 3},
        "shades": [{"id": "S1", "pos": [0, 0, 3]}],
        "lanterns": [{"id": "L1", "pos": [0, 0, 20], "lit": True, "deposited": 10}],
    }
    sim = GameSim(seed=1, scenario=sc)
    evs = sim.step({"pulse": True})
    assert any(e["name"] == "pulse" and e["data"]["stunned_ids"] == ["S1"] for e in evs)
    assert sim.shades[0].state == "stunned"
    for _ in range(15):
        sim.step()
    assert sim.shades[0].pos[2] > 6.5

    # Also verify lit lantern safe_radius=6.0 blocks shade outside z <= 4.0
    sc2 = {
        "random_motes": False,
        "random_shades": False,
        "player": {"pos": [0, 0, 0], "carried": 3, "flames": 3},
        "shades": [{"id": "S1", "pos": [0, 0, 3]}],
        "lanterns": [{"id": "L1", "pos": [0, 0, 10], "lit": True, "deposited": 10}],
    }
    sim2 = GameSim(seed=1, scenario=sc2)
    sim2.step({"pulse": True})
    for _ in range(15):
        sim2.step()
    assert sim2.shades[0].pos[2] <= 4.0


def test_shade_hit_drops_motes_and_can_lose():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "player": {"pos": [0, 0, 0], "carried": 4, "flames": 1},
        "shades": [{"id": "S1", "pos": [0, 0, 0.5]}],
    }
    sim = GameSim(seed=1, scenario=sc)
    evs = sim.step()
    hit = [e for e in evs if e["name"] == "player_hit"]
    assert len(hit) == 1
    assert hit[0]["data"]["by"] == "shade"
    assert hit[0]["data"]["dropped"] == 2
    assert sim.state == "lost"


def test_headless_determinism_and_bad_input_exit_code(tmp_path: Path):
    out1 = tmp_path / "r1.jsonl"
    out2 = tmp_path / "r2.jsonl"
    cmd1 = [sys.executable, "-m", "src.headless", "--seed", "77", "--night", "1", "--ticks", "120", "--out", str(out1)]
    cmd2 = [sys.executable, "-m", "src.headless", "--seed", "77", "--night", "1", "--ticks", "120", "--out", str(out2)]
    assert subprocess.run(cmd1, check=False).returncode == 0
    assert subprocess.run(cmd2, check=False).returncode == 0
    assert out1.read_text(encoding="utf-8") == out2.read_text(encoding="utf-8")

    bad_in = tmp_path / "bad_inputs.json"
    bad_in.write_text(json.dumps({"frames": [{"tick": 5}, {"tick": 3}]}), encoding="utf-8")
    res = subprocess.run(
        [sys.executable, "-m", "src.headless", "--seed", "1", "--night", "1", "--inputs", str(bad_in), "--ticks", "10", "--out", str(tmp_path / "x.jsonl")],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 2
