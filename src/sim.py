"""Deterministic 60Hz core simulation for Đảo Đèn Lồng (Phase 1)."""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ISLAND_RADIUS = 32.0
DT = 1.0 / 60.0
GRAVITY = -20.0
JUMP_SPEED = 7.5
MAX_RANDOM_MOTES = 15
MOTE_RESPAWN_TICKS = 300
MAX_RANDOM_SHADES = 5
SHADE_SPAWN_TICKS = 1500


def r3(val: float) -> float:
    """Round coordinate/float to 3 decimal places."""
    return round(float(val), 3)


def xz_dist(a: list[float], b: list[float]) -> float:
    """Horizontal XZ distance between two 3D points."""
    return math.hypot(a[0] - b[0], a[2] - b[2])


def load_contract(path: str | Path = "game.contract.json") -> dict[str, Any]:
    """Load game.contract.json."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@dataclass
class Lantern:
    id: str
    pos: list[float]
    lit: bool = False
    deposited: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pos": [r3(self.pos[0]), r3(self.pos[1]), r3(self.pos[2])],
            "lit": self.lit,
            "deposited": self.deposited,
        }


@dataclass
class Shade:
    id: str
    pos: list[float]
    state: str = "chase"
    stun_timer: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pos": [r3(self.pos[0]), r3(self.pos[1]), r3(self.pos[2])],
            "state": self.state,
        }


@dataclass
class Mote:
    id: str
    pos: list[float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pos": [r3(self.pos[0]), r3(self.pos[1]), r3(self.pos[2])],
        }


@dataclass
class InputState:
    move: list[float] = field(default_factory=lambda: [0.0, 0.0])
    cam_yaw_deg: float = 0.0
    jump: bool = False
    interact: bool = False
    pulse: bool = False


class GameSim:
    """Fixed-timestep (60Hz) deterministic game simulation."""

    def __init__(
        self,
        seed: int,
        night: int = 1,
        contract: dict[str, Any] | None = None,
        scenario: dict[str, Any] | None = None,
    ) -> None:
        self.seed = int(seed)
        self.night = int(night)
        self.rng = random.Random(self.seed)

        if contract is None:
            contract = load_contract()
        self.tuning = contract["tuning"]

        self.tick = 0
        self.sim_tick = 0
        self.state = "playing"
        self.score = 0

        self.initial_time_left_s = float(self.tuning["night1_duration_s"])
        self.time_left_s = self.initial_time_left_s

        # Player state
        self.player_pos = [0.0, 0.0, 0.0]
        self.player_vy = 0.0
        self.grounded = True
        self.carried = 0
        self.flames = int(self.tuning["flames"])
        self.invuln_timer = 0.0
        self.pulse_cooldown_timer = 0.0

        # Default 5 lanterns in a ring of radius 20m
        self.lanterns: list[Lantern] = []
        count = int(self.tuning["lantern_count_night1"])
        for i in range(count):
            angle = 2.0 * math.pi * i / count
            lx = r3(20.0 * math.sin(angle))
            lz = r3(20.0 * math.cos(angle))
            self.lanterns.append(Lantern(id=f"L{i + 1}", pos=[lx, 0.0, lz]))

        self.random_motes = True
        self.random_shades = True
        self._mote_seq = 0
        self._shade_seq = 0
        self.motes: list[Mote] = []
        self.shades: list[Shade] = []

        self.prev_input = InputState()
        self.curr_input = InputState()

        if scenario is not None:
            self._apply_scenario(scenario)

        if self.random_motes and not self.motes:
            for _ in range(MAX_RANDOM_MOTES):
                self._spawn_random_mote()

        if self.random_shades and not self.shades:
            for _ in range(3):
                self._spawn_random_shade()

    def _next_mote_id(self) -> str:
        self._mote_seq += 1
        return f"M{self._mote_seq}"

    def _next_shade_id(self) -> str:
        self._shade_seq += 1
        return f"S{self._shade_seq}"

    def _spawn_random_mote(self) -> Mote:
        angle = self.rng.uniform(0.0, 2.0 * math.pi)
        radius = self.rng.uniform(4.0, 28.0)
        m = Mote(
            id=self._next_mote_id(),
            pos=[r3(radius * math.cos(angle)), 0.0, r3(radius * math.sin(angle))],
        )
        self.motes.append(m)
        return m

    def _spawn_random_shade(self) -> Shade:
        angle = self.rng.uniform(0.0, 2.0 * math.pi)
        radius = self.rng.uniform(22.0, 29.0)
        s = Shade(
            id=self._next_shade_id(),
            pos=[r3(radius * math.cos(angle)), 0.0, r3(radius * math.sin(angle))],
            state="chase",
        )
        self.shades.append(s)
        return s

    def _apply_scenario(self, sc: dict[str, Any]) -> None:
        if "random_motes" in sc:
            self.random_motes = bool(sc["random_motes"])
        if "random_shades" in sc:
            self.random_shades = bool(sc["random_shades"])
        if "time_left_s" in sc:
            self.initial_time_left_s = float(sc["time_left_s"])
            self.time_left_s = self.initial_time_left_s

        if "player" in sc:
            p = sc["player"]
            if "pos" in p:
                self.player_pos = [float(p["pos"][0]), float(p["pos"][1]), float(p["pos"][2])]
                self.grounded = self.player_pos[1] <= 0.0
            if "carried" in p:
                self.carried = int(p["carried"])
            if "flames" in p:
                self.flames = int(p["flames"])

        if "lanterns" in sc:
            by_id = {l.id: l for l in self.lanterns}
            for item in sc["lanterns"]:
                lid = str(item["id"])
                if lid in by_id:
                    lan = by_id[lid]
                    if "pos" in item:
                        lan.pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                    if "deposited" in item:
                        lan.deposited = int(item["deposited"])
                    if "lit" in item:
                        lan.lit = bool(item["lit"])

        if "motes" in sc:
            self.motes = []
            for item in sc["motes"]:
                if isinstance(item, dict):
                    mid = str(item.get("id") or self._next_mote_id())
                    pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                else:
                    mid = self._next_mote_id()
                    pos = [float(item[0]), float(item[1]), float(item[2])]
                self.motes.append(Mote(id=mid, pos=pos))

        if "shades" in sc:
            self.shades = []
            for item in sc["shades"]:
                sid = str(item.get("id") or self._next_shade_id())
                pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                st = str(item.get("state", "chase"))
                self.shades.append(Shade(id=sid, pos=pos, state=st))

    def snapshot(self) -> dict[str, Any]:
        return {
            "type": "snapshot",
            "tick": self.tick,
            "sim_tick": self.sim_tick,
            "state": self.state,
            "time_left_s": r3(self.time_left_s),
            "score": self.score,
            "player": {
                "pos": [r3(self.player_pos[0]), r3(self.player_pos[1]), r3(self.player_pos[2])],
                "flames": self.flames,
                "carried": self.carried,
            },
            "lanterns": [l.to_dict() for l in self.lanterns],
            "shades": [s.to_dict() for s in self.shades],
            "motes_active": len(self.motes),
            "motes": [m.to_dict() for m in self.motes],
        }

    def step(self, frame_patch: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Advance simulation by 1 tick (1/60s) and return events with tick = k+1."""
        if self.state != "playing":
            return []

        events: list[dict[str, Any]] = []
        next_tick = self.tick + 1

        # Update input state from frame_patch
        self.prev_input = InputState(
            move=list(self.curr_input.move),
            cam_yaw_deg=self.curr_input.cam_yaw_deg,
            jump=self.curr_input.jump,
            interact=self.curr_input.interact,
            pulse=self.curr_input.pulse,
        )
        if frame_patch:
            if "move" in frame_patch:
                self.curr_input.move = [float(frame_patch["move"][0]), float(frame_patch["move"][1])]
            if "cam_yaw_deg" in frame_patch:
                self.curr_input.cam_yaw_deg = float(frame_patch["cam_yaw_deg"])
            if "jump" in frame_patch:
                self.curr_input.jump = bool(frame_patch["jump"])
            if "interact" in frame_patch:
                self.curr_input.interact = bool(frame_patch["interact"])
            if "pulse" in frame_patch:
                self.curr_input.pulse = bool(frame_patch["pulse"])

        # Timers
        if self.invuln_timer > 0.0:
            self.invuln_timer = max(0.0, self.invuln_timer - DT)
        if self.pulse_cooldown_timer > 0.0:
            self.pulse_cooldown_timer = max(0.0, self.pulse_cooldown_timer - DT)

        # 1. Player movement
        mx, mz = self.curr_input.move
        theta = math.radians(self.curr_input.cam_yaw_deg)
        wx = mx * math.cos(theta) + mz * math.sin(theta)
        wz = -mx * math.sin(theta) + mz * math.cos(theta)
        mag = math.hypot(wx, wz)
        if mag > 1.0:
            wx /= mag
            wz /= mag

        speed = float(self.tuning["player_speed"])
        self.player_pos[0] += wx * speed * DT
        self.player_pos[2] += wz * speed * DT

        # Jump & gravity
        if self.curr_input.jump and not self.prev_input.jump and self.grounded:
            self.player_vy = JUMP_SPEED
            self.grounded = False
        if not self.grounded:
            self.player_vy += GRAVITY * DT
            self.player_pos[1] += self.player_vy * DT
            if self.player_pos[1] <= 0.0:
                self.player_pos[1] = 0.0
                self.player_vy = 0.0
                self.grounded = True

        # Fall off island check
        if self.tuning["fall_enabled"] and math.hypot(self.player_pos[0], self.player_pos[2]) > ISLAND_RADIUS:
            self.flames = max(0, self.flames - 1)
            dropped = int(self.carried * float(self.tuning["hit_drop_ratio"]))
            self.carried -= dropped
            self.player_pos = [0.0, 0.0, 0.0]
            self.player_vy = 0.0
            self.grounded = True
            self.invuln_timer = float(self.tuning["invuln_s"])
            events.append({
                "type": "event",
                "tick": next_tick,
                "name": "player_hit",
                "data": {"by": "fall", "flames": self.flames, "dropped": dropped},
            })
            if self.flames <= 0:
                self.state = "lost"
                events.append({
                    "type": "event",
                    "tick": next_tick,
                    "name": "game_over",
                    "data": {"result": "lost", "reason": "no_flames"},
                })

        # 2. Mote pickup
        if self.state == "playing":
            cap = int(self.tuning["carry_capacity"])
            pr = float(self.tuning["pickup_radius"])
            remaining_motes: list[Mote] = []
            for m in self.motes:
                if self.carried < cap and xz_dist(self.player_pos, m.pos) <= pr:
                    self.carried += 1
                    self.score += int(self.tuning["score"]["per_mote"])
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "mote_picked",
                        "data": {"carried": self.carried},
                    })
                else:
                    remaining_motes.append(m)
            self.motes = remaining_motes

        # 3. Interact / Deposit into lantern
        if self.state == "playing" and self.curr_input.interact and not self.prev_input.interact:
            ir = float(self.tuning["interact_radius"])
            cost = int(self.tuning["lantern_cost"])
            candidates = [
                l for l in self.lanterns
                if not l.lit and xz_dist(self.player_pos, l.pos) <= ir
            ]
            if candidates and self.carried > 0:
                target = min(candidates, key=lambda l: xz_dist(self.player_pos, l.pos))
                needed = max(0, cost - target.deposited)
                amount = min(self.carried, needed)
                if amount > 0:
                    self.carried -= amount
                    target.deposited += amount
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "deposit",
                        "data": {
                            "lantern_id": target.id,
                            "amount": amount,
                            "deposited": target.deposited,
                        },
                    })
                    if target.deposited >= cost:
                        target.lit = True
                        self.score += int(self.tuning["score"]["per_lantern"])
                        events.append({
                            "type": "event",
                            "tick": next_tick,
                            "name": "lantern_lit",
                            "data": {"lantern_id": target.id},
                        })

        # Check win condition (all lanterns lit)
        if self.state == "playing" and all(l.lit for l in self.lanterns):
            self.tick = next_tick
            self.sim_tick += 1
            self.time_left_s = max(0.0, self.initial_time_left_s - self.sim_tick * DT)
            self.state = "won"
            self.score += int(self.time_left_s * int(self.tuning["score"]["per_second_left"]))
            self.score += self.flames * int(self.tuning["score"]["per_flame_left"])
            events.append({
                "type": "event",
                "tick": next_tick,
                "name": "game_over",
                "data": {"result": "won", "reason": "all_lit"},
            })
            return events

        # 4. Pulse (stun & push shades)
        if self.state == "playing" and self.curr_input.pulse and not self.prev_input.pulse:
            p_cost = int(self.tuning["pulse_cost"])
            if self.pulse_cooldown_timer <= 0.0 and self.carried >= p_cost:
                self.carried -= p_cost
                self.pulse_cooldown_timer = float(self.tuning["pulse_cooldown_s"])
                p_rad = float(self.tuning["pulse_radius"])
                p_stun = float(self.tuning["pulse_stun_s"])
                p_push = float(self.tuning["pulse_push_m"])
                stunned_ids: list[str] = []
                for s in self.shades:
                    if xz_dist(self.player_pos, s.pos) <= p_rad:
                        s.state = "stunned"
                        s.stun_timer = p_stun
                        dx = s.pos[0] - self.player_pos[0]
                        dz = s.pos[2] - self.player_pos[2]
                        d = math.hypot(dx, dz)
                        ux, uz = (dx / d, dz / d) if d > 1e-6 else (1.0, 0.0)
                        s.pos[0] += ux * p_push
                        s.pos[2] += uz * p_push
                        self.score += int(self.tuning["score"]["per_stun"])
                        stunned_ids.append(s.id)
                events.append({
                    "type": "event",
                    "tick": next_tick,
                    "name": "pulse",
                    "data": {"stunned_ids": stunned_ids},
                })

        # 5. Random spawns (only if enabled)
        if self.state == "playing":
            if self.random_motes and next_tick % MOTE_RESPAWN_TICKS == 0 and len(self.motes) < MAX_RANDOM_MOTES:
                self._spawn_random_mote()
            if self.random_shades and next_tick % SHADE_SPAWN_TICKS == 0 and len(self.shades) < MAX_RANDOM_SHADES:
                ns = self._spawn_random_shade()
                events.append({
                    "type": "event",
                    "tick": next_tick,
                    "name": "shade_spawned",
                    "data": {"id": ns.id},
                })

        # 6. Shades AI & collision
        if self.state == "playing":
            s_speed = float(self.tuning["shade_speed"])
            s_hit = float(self.tuning["shade_hit_radius"])
            safe_r = float(self.tuning["safe_radius"])
            lit_lanterns = [l for l in self.lanterns if l.lit]

            for s in self.shades:
                if s.state == "stunned":
                    s.stun_timer -= DT
                    if s.stun_timer <= 0.0:
                        s.state = "chase"
                        s.stun_timer = 0.0
                    continue

                # Chase player
                dx = self.player_pos[0] - s.pos[0]
                dz = self.player_pos[2] - s.pos[2]
                d = math.hypot(dx, dz)
                if d > 1e-6:
                    step_d = min(d, s_speed * DT)
                    s.pos[0] += (dx / d) * step_d
                    s.pos[2] += (dz / d) * step_d

                # Enforce safe_radius around lit lanterns
                for lan in lit_lanterns:
                    ldx = s.pos[0] - lan.pos[0]
                    ldz = s.pos[2] - lan.pos[2]
                    ld = math.hypot(ldx, ldz)
                    if ld <= safe_r:
                        ux, uz = (ldx / ld, ldz / ld) if ld > 1e-6 else (1.0, 0.0)
                        s.pos[0] = lan.pos[0] + ux * (safe_r + 0.01)
                        s.pos[2] = lan.pos[2] + uz * (safe_r + 0.01)

                # Hit player check
                if self.invuln_timer <= 0.0 and xz_dist(self.player_pos, s.pos) <= s_hit:
                    self.flames = max(0, self.flames - 1)
                    dropped = int(self.carried * float(self.tuning["hit_drop_ratio"]))
                    self.carried -= dropped
                    self.invuln_timer = float(self.tuning["invuln_s"])
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "player_hit",
                        "data": {"by": "shade", "flames": self.flames, "dropped": dropped},
                    })
                    if self.flames <= 0:
                        self.state = "lost"
                        events.append({
                            "type": "event",
                            "tick": next_tick,
                            "name": "game_over",
                            "data": {"result": "lost", "reason": "no_flames"},
                        })
                        break

        # 7. Advance clock & check dawn
        self.tick = next_tick
        self.sim_tick += 1
        self.time_left_s = max(0.0, self.initial_time_left_s - self.sim_tick * DT)
        if self.state == "playing" and self.time_left_s <= 0.0:
            self.state = "lost"
            events.append({
                "type": "event",
                "tick": next_tick,
                "name": "game_over",
                "data": {"result": "lost", "reason": "dawn"},
            })

        return events
