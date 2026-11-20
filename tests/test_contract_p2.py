"""Phase 2 headless scenario tests for Ticket-02 (Contract v1.1)."""

import json
import subprocess
import sys
import time
from pathlib import Path

from src.sim import GameSim


def test_dash_and_cooldown():
    sc = {"random_motes": False, "random_shades": False, "motes": [], "shades": []}
    sim = GameSim(seed=1, night=1, scenario=sc)
    evs = sim.step({"dash": True})
    assert any(e["name"] == "dash" for e in evs)
    for _ in range(11):
        sim.step({"dash": False})
    # 12 ticks at 14 m/s = 2.8m along +Z
    assert abs(sim.player_pos[2] - 2.8) < 0.05
    assert sim.dash_cd_ticks > 0


def test_pause_freezes_sim_tick_and_time():
    sc = {"random_motes": False, "random_shades": False, "motes": [], "shades": []}
    sim = GameSim(seed=1, night=1, scenario=sc)
    sim.step()
    t0 = sim.time_left_s
    evs = sim.step({"pause": True})
    assert any(e["name"] == "paused" for e in evs)
    assert sim.state == "paused"
    for _ in range(30):
        sim.step({"pause": False})
    assert sim.tick == 32
    assert sim.sim_tick == 1
    assert sim.time_left_s == t0
    evs2 = sim.step({"pause": True})
    assert any(e["name"] == "resumed" for e in evs2)
    assert sim.state == "playing"


def test_drifter_steal_and_pulse_drop():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "random_drifters": False,
        "player": {"pos": [0, 0, 0], "carried": 6, "flames": 3},
        "drifters": [{"id": "D1", "pos": [0, 0, 0.8], "state": "chase"}],
    }
    sim = GameSim(seed=1, night=2, scenario=sc)
    evs = sim.step()
    assert any(e["name"] == "drifter_steal" and e["data"]["amount"] == 3 for e in evs)
    assert sim.carried == 3
    assert sim.drifters[0].state == "flee"
    evs2 = sim.step({"pulse": True})
    assert any(e["name"] == "drifter_drop" and e["data"]["amount"] == 3 for e in evs2)
    assert len(sim.motes) == 3


def test_charm_boosts_speed_and_removes_dash_cooldown():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "random_drifters": False,
        "player": {"pos": [35, 0, 0], "carried": 0, "flames": 3},
        "charms": [{"id": "C1", "pos": [35, 0, 0], "available": True}],
    }
    sim = GameSim(seed=1, night=2, scenario=sc)
    evs = sim.step()
    assert any(e["name"] == "charm_picked" for e in evs)
    assert sim.charm_ticks > 0
    sim.step({"dash": True})
    assert sim.dash_cd_ticks == 0


def test_night2_jump_pad_and_night3_ramp():
    # Night 2 jump pad at (20, 0, 18)
    sc2 = {
        "random_motes": False,
        "random_shades": False,
        "random_drifters": False,
        "player": {"pos": [20, 0, 18], "carried": 0, "flames": 3},
    }
    sim2 = GameSim(seed=1, night=2, scenario=sc2)
    sim2.step()
    assert sim2.launched is True
    assert sim2.player_vel[1] == 14.0
    for _ in range(100):
        sim2.step()
    assert sim2.player_pos[0] > 42.0  # Landed on Island B

    # Night 3 jump pad at (0, 3, 13) -> Tier 2 (Y=6)
    sc3 = {
        "random_motes": False,
        "random_shades": False,
        "random_drifters": False,
        "wind_enabled": False,
        "player": {"pos": [0, 3, 13], "carried": 0, "flames": 3},
    }
    sim3 = GameSim(seed=1, night=3, scenario=sc3)
    sim3.step()
    assert sim3.launched is True
    for _ in range(90):
        sim3.step()
    assert sim3.player_pos[1] == 6.0


def test_headless_full_night3_performance(tmp_path: Path):
    out = tmp_path / "n3_full.jsonl"
    t0 = time.perf_counter()
    res = subprocess.run(
        [sys.executable, "-m", "src.headless", "--seed", "1", "--night", "3", "--ticks", "21600", "--out", str(out)],
        check=False,
    )
    elapsed = time.perf_counter() - t0
    assert res.returncode == 0
    assert elapsed <= 30.0
    assert out.exists()
