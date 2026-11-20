"""Phase 3 headless scenario tests for Ticket-03 (Contract v1.2)."""

from src.sim import GameSim


def test_fuel_decay_lantern_out_and_relight_cost_5():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "time_left_s": 100,
        "player": {"pos": [0, 0, 24.5], "carried": 5, "flames": 3},
        "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 1.0, "ever_lit": True}],
    }
    sim = GameSim(seed=1, night=1, scenario=sc)
    evs = []
    for _ in range(60):
        evs.extend(sim.step())
    assert any(e["name"] == "lantern_out" and e["data"]["lantern_id"] == "L1" for e in evs)
    assert sim.lanterns[0].lit is False
    assert sim.lanterns[0].ever_lit is True

    # Relight needs only 5 motes and grants +40 relight bonus (+25 deposit)
    evs2 = sim.step({"interact": True})
    assert any(e["name"] == "lantern_lit" and e["data"]["relight"] is True for e in evs2)
    assert sim.lanterns[0].lit is True
    assert sim.lanterns[0].relit_count == 1
    assert sim.capacity == 12
    assert sim.score == 5 * 5 + 40


def test_refuel_partial_lantern():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "player": {"pos": [0, 0, 24.5], "carried": 4, "flames": 3},
        "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 85.0}],
    }
    sim = GameSim(seed=1, night=1, scenario=sc)
    evs = sim.step({"interact": True})
    # ceil((100 - 84.983)/10) = 2 motes used -> capped at 100.0
    assert any(e["name"] == "refuel" and e["data"]["amount"] == 2 for e in evs)
    assert sim.carried == 2
    assert sim.lanterns[0].fuel_float() == 100.0
    assert sim.score == 10


def test_shade_drain_and_pulse_bonus_15():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "player": {"pos": [0, 0, 18], "carried": 3, "flames": 3},
        "lanterns": [{"id": "L1", "pos": [0, 0, 25], "lit": True, "fuel": 25.0}],
        "shades": [{"id": "S1", "pos": [0, 0, 25.5], "state": "drain", "target_lantern_id": "L1"}],
    }
    sim = GameSim(seed=1, night=1, scenario=sc)
    evs = []
    for _ in range(60):
        evs.extend(sim.step())
    assert any(e["name"] == "fuel_drain" for e in evs)
    assert sim.lanterns[0].fuel_float() < 20.0
    # Move within 5m and pulse while S1 is in drain (step 7 runs before step 8)
    sim.player_pos = [0.0, 0.0, 21.5]
    evs_p = sim.step({"pulse": True})
    assert any(e["name"] == "pulse" and e["data"]["stunned_ids"] == ["S1"] for e in evs_p)
    assert sim.score == 15


def test_dawn_loss_below_threshold():
    sc = {
        "random_motes": False,
        "random_shades": False,
        "time_left_s": 0.5,
        "lanterns": [
            {"id": "L1", "lit": True, "fuel": 50.0},
            {"id": "L2", "lit": True, "fuel": 50.0},
            {"id": "L3", "lit": False},
            {"id": "L4", "lit": False},
            {"id": "L5", "lit": False},
        ],
    }
    sim = GameSim(seed=1, night=1, scenario=sc)
    evs = []
    for _ in range(35):
        if sim.state != "playing":
            break
        evs.extend(sim.step())
    assert sim.state == "lost"
    assert any(e["name"] == "game_over" and e["data"]["reason"] == "dawn" for e in evs)
