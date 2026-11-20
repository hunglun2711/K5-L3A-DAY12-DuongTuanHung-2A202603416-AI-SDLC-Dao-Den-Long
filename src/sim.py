"""Deterministic 60Hz core simulation for Đảo Đèn Lồng (Contract v1.1, Nights 1-3)."""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DT = 1.0 / 60.0
GRAVITY = -20.0
JUMP_SPEED = 7.0
MAX_RANDOM_MOTES = 30
MOTE_SPAWN_INTERVAL = 240
DRIFTER_SPAWN_INTERVAL = 1200


def r3(val: float) -> float:
    return round(float(val), 3)


def xz_dist(a: list[float], b: list[float]) -> float:
    return math.hypot(a[0] - b[0], a[2] - b[2])


def dist_3d(a: list[float], b: list[float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def load_contract(path: str | Path = "game.contract.json") -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def polar(r: float, deg: float, y: float = 0.0) -> list[float]:
    rad = math.radians(deg)
    return [r3(r * math.cos(rad)), r3(y), r3(r * math.sin(rad))]


def _night_config(night: int) -> dict[str, Any]:
    if night == 1:
        mote_pts = [polar(12.0, i * 45.0) for i in range(8)] + [polar(33.0, i * 22.5) for i in range(16)]
        shade_pts = [polar(37.0, 15.0 + i * 30.0) for i in range(12)]
        lanterns = [
            ("L1", [0.0, 0.0, 25.0]),
            ("L2", [23.8, 0.0, 7.7]),
            ("L3", [14.7, 0.0, -20.2]),
            ("L4", [-14.7, 0.0, -20.2]),
            ("L5", [-23.8, 0.0, 7.7]),
        ]
        return {
            "lanterns": lanterns,
            "mote_pts": mote_pts,
            "shade_pts": shade_pts,
            "shade_interval": 480,
            "max_shades": 6,
            "shade_speed": 4.0,
            "charms": [],
            "jump_pads": [],
            "wind_enabled": False,
        }
    if night == 2:
        mote_pts = []
        for cx in (0.0, 70.0):
            for i in range(4):
                p = polar(10.0, i * 90.0)
                mote_pts.append([r3(p[0] + cx), 0.0, p[2]])
            for i in range(8):
                p = polar(22.0, i * 45.0)
                mote_pts.append([r3(p[0] + cx), 0.0, p[2]])
        shade_pts = []
        for cx in (0.0, 70.0):
            for i in range(8):
                p = polar(26.0, 22.5 + i * 45.0)
                shade_pts.append([r3(p[0] + cx), 0.0, p[2]])
        lanterns = [
            ("L1", [0.0, 0.0, 20.0]),
            ("L2", [17.0, 0.0, -10.0]),
            ("L3", [-17.0, 0.0, -10.0]),
            ("L4", [70.0, 0.0, 20.0]),
            ("L5", [87.0, 0.0, -10.0]),
            ("L6", [53.0, 0.0, -10.0]),
        ]
        return {
            "lanterns": lanterns,
            "mote_pts": mote_pts,
            "shade_pts": shade_pts,
            "shade_interval": 420,
            "max_shades": 8,
            "shade_speed": 4.0,
            "charms": [("C1", [35.0, 0.0, 0.0])],
            "jump_pads": [
                {"pos": [20.0, 0.0, 18.0], "target": [70.0, 0.0, 0.0], "vy": 14.0, "vh": 24.0},
                {"pos": [50.0, 0.0, -18.0], "target": [0.0, 0.0, 0.0], "vy": 14.0, "vh": 24.0},
            ],
            "wind_enabled": False,
        }
    # Night 3 — Đảo Chuông
    mote_pts = (
        [polar(34.0, i * 20.0, 0.0) for i in range(18)]
        + [polar(18.0, 20.0 + i * 20.0, 3.0) for i in range(8)]
        + [polar(5.0, 45.0 + i * 90.0, 6.0) for i in range(4)]
    )
    shade_pts = [polar(43.0, i * 22.5, 0.0) for i in range(16)]
    lanterns = [
        ("L1", [0.0, 6.0, 6.0]),
        ("L2", [18.0, 3.0, 10.0]),
        ("L3", [-18.0, 3.0, 10.0]),
        ("L4", [35.0, 0.0, -10.0]),
        ("L5", [-35.0, 0.0, -10.0]),
        ("L6", [20.0, 0.0, -35.0]),
        ("L7", [-20.0, 0.0, -35.0]),
    ]
    return {
        "lanterns": lanterns,
        "mote_pts": mote_pts,
        "shade_pts": shade_pts,
        "shade_interval": 360,
        "max_shades": 10,
        "shade_speed": 4.5,
        "charms": [("C1", [30.0, 0.0, 25.0]), ("C2", [-30.0, 0.0, 25.0])],
        "jump_pads": [
            {"pos": [0.0, 3.0, 13.0], "dir": [0.0, -1.0], "vy": 12.0, "vh": 8.0},
        ],
        "wind_enabled": True,
    }


def ground_height(night: int, x: float, z: float, current_y: float = 0.0) -> float | None:
    """Return floor Y at (x, z) reachable from current_y, or None if over void."""
    if night == 1:
        return 0.0 if math.hypot(x, z) <= 40.0 else None
    if night == 2:
        on_a = math.hypot(x, z) <= 28.0
        on_b = math.hypot(x - 70.0, z) <= 28.0
        on_bridge = 26.0 <= x <= 44.0 and -2.0 <= z <= 2.0
        return 0.0 if (on_a or on_b or on_bridge) else None
    # Night 3
    r = math.hypot(x, z)
    if r > 45.0:
        return None
    heights = [0.0]
    if r <= 8.0 and current_y >= 5.5:
        heights.append(6.0)
    if 12.0 <= r <= 24.0 and z > 0.0 and current_y >= 2.5:
        heights.append(3.0)
    for deg in (30.0, 150.0):
        rad = math.radians(deg)
        ca, sa = math.cos(rad), math.sin(rad)
        proj = x * ca + z * sa
        perp = abs(-x * sa + z * ca)
        if 24.0 <= proj <= 30.0 and perp <= 1.5:
            ry = 3.0 * (30.0 - proj) / 6.0
            if current_y >= ry - 0.5:
                heights.append(ry)
    return max(heights)


def ceiling_or_cliff_blocked(night: int, x: float, z: float, y: float) -> bool:
    """True if (x, z) at height y hits bell tower or a vertical cliff."""
    if night != 3:
        return False
    r = math.hypot(x, z)
    if r < 2.0 and y >= 5.5:
        return True  # Bell tower
    # Check if stepping into higher tier without being high enough
    for deg in (30.0, 150.0):
        rad = math.radians(deg)
        ca, sa = math.cos(rad), math.sin(rad)
        proj = x * ca + z * sa
        perp = abs(-x * sa + z * ca)
        if 24.0 <= proj <= 30.0 and perp <= 1.5:
            return False  # On ramp
    if r <= 8.0 and y < 5.65 and y > 0.5:
        return True
    if 12.0 <= r <= 24.0 and z > 0.0 and y < 2.65:
        return True
    if r <= 8.0 and y < 5.65:
        return True
    return False


@dataclass
class Lantern:
    id: str
    pos: list[float]
    lit: bool = False
    deposited: int = 0
    just_lit_ticks: int = 0

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
    state_ticks_left: int = 0
    push_vx: float = 0.0
    push_vz: float = 0.0
    push_ticks: int = 0

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
    kind: str = "random"
    ttl_ticks: int = 0
    born_tick: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pos": [r3(self.pos[0]), r3(self.pos[1]), r3(self.pos[2])],
            "kind": self.kind,
            "ttl_s": r3(self.ttl_ticks * DT) if self.kind == "dropped" else None,
        }


@dataclass
class Drifter:
    id: str
    pos: list[float]
    state: str = "idle"
    stolen: int = 0
    state_ticks_left: int = 0
    has_stolen: bool = False
    born_tick: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "pos": [r3(self.pos[0]), r3(self.pos[1]), r3(self.pos[2])],
            "state": self.state,
            "stolen": self.stolen,
        }


@dataclass
class Charm:
    id: str
    pos: list[float]
    available: bool = True
    respawn_ticks: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "available": self.available,
            "respawn_s": r3(self.respawn_ticks * DT),
        }


@dataclass
class InputState:
    move: list[float] = field(default_factory=lambda: [0.0, 0.0])
    cam_yaw_deg: float = 0.0
    jump: bool = False
    interact: bool = False
    pulse: bool = False
    dash: bool = False
    pause: bool = False


class GameSim:
    """Fixed-timestep (60Hz) deterministic game simulation (Contract v1.1)."""

    def __init__(
        self,
        seed: int,
        night: int = 1,
        contract: dict[str, Any] | None = None,
        scenario: dict[str, Any] | None = None,
    ) -> None:
        self.seed = int(seed)
        self.night = int(night)
        self.rng = random.Random(self.seed + self.night * 10007)
        if contract is None:
            contract = load_contract()
        self.tuning = contract["tuning"]
        self.cfg = _night_config(self.night)

        self.tick = 0
        self.sim_tick = 0
        self.state = "playing"
        self.score = 0

        dur_key = f"night{self.night}_duration_s"
        self.initial_time_left_s = float(self.tuning.get(dur_key, self.tuning["night1_duration_s"]))
        self.time_left_s = self.initial_time_left_s

        # Player
        self.player_pos = [0.0, 0.0, 0.0]
        self.player_vel = [0.0, 0.0, 0.0]
        self.facing = [0.0, 1.0]  # +Z
        self.grounded = True
        self.carried = 0
        self.flames = int(self.tuning["flames"])
        self.invuln_ticks = 0
        self.dash_ticks = 0
        self.dash_dir = [0.0, 1.0]
        self.dash_cd_ticks = 0
        self.pulse_cd_ticks = 0
        self.charm_ticks = 0
        self.fall_respawn_ticks = 0
        self.fall_triggered = False
        self.launched = False

        # Entities
        self.lanterns = [Lantern(id=lid, pos=list(lpos)) for lid, lpos in self.cfg["lanterns"]]
        self.random_motes = True
        self.random_shades = True
        self.random_drifters = self.night in (2, 3)
        self.wind_enabled = bool(self.cfg["wind_enabled"])
        self.wind_active = False
        self.wind_dir_deg = 0.0
        self.wind_timer = 1800

        self._mote_seq = 0
        self._shade_seq = 0
        self._drifter_seq = 0
        self.motes: list[Mote] = []
        self.shades: list[Shade] = []
        self.drifters: list[Drifter] = []
        self.charms: list[Charm] = [Charm(id=cid, pos=list(cpos)) for cid, cpos in self.cfg["charms"]]

        self.prev_input = InputState()
        self.curr_input = InputState()

        if scenario is not None:
            self._apply_scenario(scenario)

        if self.random_motes and not self.motes:
            pts = list(self.cfg["mote_pts"])
            self.rng.shuffle(pts)
            for p in pts[:20]:
                self._mote_seq += 1
                self.motes.append(Mote(id=f"M{self._mote_seq}", pos=list(p), kind="random"))

    def _apply_scenario(self, sc: dict[str, Any]) -> None:
        if "random_motes" in sc:
            self.random_motes = bool(sc["random_motes"])
        if "random_shades" in sc:
            self.random_shades = bool(sc["random_shades"])
        if "random_drifters" in sc:
            self.random_drifters = bool(sc["random_drifters"])
        if "wind_enabled" in sc:
            self.wind_enabled = bool(sc["wind_enabled"])
        if "time_left_s" in sc:
            self.initial_time_left_s = float(sc["time_left_s"])
            self.time_left_s = self.initial_time_left_s

        if "player" in sc:
            p = sc["player"]
            if "pos" in p:
                self.player_pos = [float(p["pos"][0]), float(p["pos"][1]), float(p["pos"][2])]
                gh = ground_height(self.night, self.player_pos[0], self.player_pos[2], self.player_pos[1])
                self.grounded = gh is not None and abs(self.player_pos[1] - gh) <= 0.05
            if "carried" in p:
                self.carried = int(p["carried"])
            if "flames" in p:
                self.flames = int(p["flames"])
            if "invuln_ticks" in p:
                self.invuln_ticks = int(p["invuln_ticks"])
            if "dash_cd_ticks" in p:
                self.dash_cd_ticks = int(p["dash_cd_ticks"])
            if "pulse_cd_ticks" in p:
                self.pulse_cd_ticks = int(p["pulse_cd_ticks"])
            if "charm_ticks" in p:
                self.charm_ticks = int(p["charm_ticks"])

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
                    mid = str(item.get("id") or f"M{self._next_mseq()}")
                    pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                    kind = str(item.get("kind", "random"))
                    ttl = int(item.get("ttl_ticks", 480 if kind == "dropped" else 0))
                else:
                    mid = f"M{self._next_mseq()}"
                    pos = [float(item[0]), float(item[1]), float(item[2])]
                    kind, ttl = "random", 0
                self.motes.append(Mote(id=mid, pos=pos, kind=kind, ttl_ticks=ttl))

        if "shades" in sc:
            self.shades = []
            for item in sc["shades"]:
                self._shade_seq += 1
                sid = str(item.get("id") or f"S{self._shade_seq}")
                pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                st = str(item.get("state", "chase"))
                stl = int(item.get("state_ticks_left", 0))
                self.shades.append(Shade(id=sid, pos=pos, state=st, state_ticks_left=stl))

        if "drifters" in sc:
            self.drifters = []
            for item in sc["drifters"]:
                self._drifter_seq += 1
                did = str(item.get("id") or f"D{self._drifter_seq}")
                pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                st = str(item.get("state", "idle"))
                stolen = int(item.get("stolen", 0))
                self.drifters.append(Drifter(id=did, pos=pos, state=st, stolen=stolen))

        if "charms" in sc:
            self.charms = []
            for item in sc["charms"]:
                cid = str(item["id"])
                pos = [float(item["pos"][0]), float(item["pos"][1]), float(item["pos"][2])]
                avail = bool(item.get("available", True))
                resp = int(item.get("respawn_ticks", 0))
                self.charms.append(Charm(id=cid, pos=pos, available=avail, respawn_ticks=resp))

    def _next_mseq(self) -> int:
        self._mote_seq += 1
        return self._mote_seq

    def snapshot(self) -> dict[str, Any]:
        return {
            "type": "snapshot",
            "tick": self.tick,
            "sim_tick": self.sim_tick,
            "night": self.night,
            "state": self.state,
            "time_left_s": r3(self.time_left_s),
            "score": self.score,
            "wind": {"active": self.wind_active, "dir_deg": r3(self.wind_dir_deg)},
            "player": {
                "pos": [r3(self.player_pos[0]), r3(self.player_pos[1]), r3(self.player_pos[2])],
                "vel": [r3(self.player_vel[0]), r3(self.player_vel[1]), r3(self.player_vel[2])],
                "grounded": self.grounded,
                "flames": self.flames,
                "carried": self.carried,
                "invuln": self.invuln_ticks > 0,
                "dash_cd_s": r3(self.dash_cd_ticks * DT),
                "pulse_cd_s": r3(self.pulse_cd_ticks * DT),
                "charm_s": r3(self.charm_ticks * DT),
            },
            "lanterns": [l.to_dict() for l in self.lanterns],
            "shades": [s.to_dict() for s in self.shades],
            "motes_active": len(self.motes),
            "motes": [m.to_dict() for m in self.motes],
            "drifters": [d.to_dict() for d in self.drifters],
            "charms": [c.to_dict() for c in self.charms],
        }

    def step(self, frame_patch: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        if self.state in ("won", "lost"):
            return []

        events: list[dict[str, Any]] = []
        next_tick = self.tick + 1

        # 1. Read input (handle pause first)
        self.prev_input = InputState(
            move=list(self.curr_input.move),
            cam_yaw_deg=self.curr_input.cam_yaw_deg,
            jump=self.curr_input.jump,
            interact=self.curr_input.interact,
            pulse=self.curr_input.pulse,
            dash=self.curr_input.dash,
            pause=self.curr_input.pause,
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
            if "dash" in frame_patch:
                self.curr_input.dash = bool(frame_patch["dash"])
            if "pause" in frame_patch:
                self.curr_input.pause = bool(frame_patch["pause"])

        pause_edge = self.curr_input.pause and not self.prev_input.pause
        if self.state == "playing" and pause_edge:
            self.state = "paused"
            self.tick = next_tick
            events.append({"type": "event", "tick": next_tick, "name": "paused", "data": {}})
            return events
        if self.state == "paused":
            if pause_edge:
                self.state = "playing"
                events.append({"type": "event", "tick": next_tick, "name": "resumed", "data": {}})
            else:
                self.tick = next_tick
                return events

        # 2. Decrement timers
        self.sim_tick += 1
        self.time_left_s = max(0.0, self.initial_time_left_s - self.sim_tick * DT)
        if self.invuln_ticks > 0:
            self.invuln_ticks -= 1
        if self.dash_cd_ticks > 0:
            self.dash_cd_ticks -= 1
        if self.pulse_cd_ticks > 0:
            self.pulse_cd_ticks -= 1
        if self.charm_ticks > 0:
            self.charm_ticks -= 1
        if self.dash_ticks > 0:
            self.dash_ticks -= 1

        # Dropped mote TTL
        kept_motes: list[Mote] = []
        for m in self.motes:
            if m.kind == "dropped":
                m.ttl_ticks -= 1
                if m.ttl_ticks <= 0:
                    continue
            kept_motes.append(m)
        self.motes = kept_motes

        # Charm respawn
        for c in self.charms:
            if not c.available and c.respawn_ticks > 0:
                c.respawn_ticks -= 1
                if c.respawn_ticks == 0:
                    c.available = True

        # Shade state timers
        for s in self.shades:
            if s.state_ticks_left > 0:
                s.state_ticks_left -= 1
                if s.state_ticks_left == 0 and s.state in ("stunned", "recoil", "spawning"):
                    s.state = "chase"

        # Wind timer (Night 3)
        if self.wind_enabled:
            self.wind_timer -= 1
            if self.wind_active and self.wind_timer <= 0:
                self.wind_active = False
                self.wind_timer = 1500  # 25s until next gust (total 30s cycle)
            elif not self.wind_active and self.wind_timer <= 0:
                self.wind_active = True
                self.wind_dir_deg = self.rng.uniform(0.0, 360.0)
                self.wind_timer = 300  # 5s gust

        # 3. Move Mây (jump, dash, jump pads, wind) & check fall
        if self.fall_respawn_ticks > 0:
            self.fall_respawn_ticks -= 1
            if self.fall_respawn_ticks == 0:
                self.player_pos = [0.0, 0.0, 0.0]
                self.player_vel = [0.0, 0.0, 0.0]
                self.grounded = True
                self.launched = False
                self.fall_triggered = False
                self.invuln_ticks = 90
        else:
            mx, mz = self.curr_input.move
            theta = math.radians(self.curr_input.cam_yaw_deg)
            wx = mx * math.cos(theta) + mz * math.sin(theta)
            wz = -mx * math.sin(theta) + mz * math.cos(theta)
            mag = math.hypot(wx, wz)
            if mag > 1.0:
                wx /= mag
                wz /= mag
                mag = 1.0
            if mag > 1e-4:
                self.facing = [wx / mag, wz / mag]

            # Dash trigger
            if (
                self.curr_input.dash
                and not self.prev_input.dash
                and self.dash_ticks == 0
                and (self.dash_cd_ticks == 0 or self.charm_ticks > 0)
            ):
                self.dash_ticks = 12
                self.dash_cd_ticks = 0 if self.charm_ticks > 0 else 90
                self.dash_dir = list(self.facing)
                events.append({"type": "event", "tick": next_tick, "name": "dash", "data": {}})

            if self.dash_ticks > 0:
                vx = self.dash_dir[0] * float(self.tuning["dash_speed"])
                vz = self.dash_dir[1] * float(self.tuning["dash_speed"])
                self.player_vel[1] = 0.0
            elif self.launched:
                vx, vz = self.player_vel[0], self.player_vel[2]
            else:
                spd = 7.2 if self.charm_ticks > 0 else float(self.tuning["player_speed"])
                vx, vz = wx * spd, wz * spd

            if self.wind_active:
                wrad = math.radians(self.wind_dir_deg)
                vx += 2.0 * math.cos(wrad)
                vz += 2.0 * math.sin(wrad)

            nx = self.player_pos[0] + vx * DT
            nz = self.player_pos[2] + vz * DT
            if not ceiling_or_cliff_blocked(self.night, nx, nz, self.player_pos[1]):
                self.player_pos[0] = nx
                self.player_pos[2] = nz
            self.player_vel[0] = vx
            self.player_vel[2] = vz

            # Jump
            if self.curr_input.jump and not self.prev_input.jump and self.grounded and self.dash_ticks == 0:
                self.player_vel[1] = JUMP_SPEED
                self.grounded = False

            # Gravity if not dashing
            if self.dash_ticks == 0:
                gh = ground_height(self.night, self.player_pos[0], self.player_pos[2], self.player_pos[1])
                if not self.grounded or gh is None or self.player_pos[1] > gh + 0.01:
                    self.player_vel[1] += GRAVITY * DT
                    self.player_pos[1] += self.player_vel[1] * DT
                    gh_after = ground_height(self.night, self.player_pos[0], self.player_pos[2], self.player_pos[1])
                    if gh_after is not None and self.player_pos[1] <= gh_after and self.player_vel[1] <= 0.0:
                        self.player_pos[1] = gh_after
                        self.player_vel[1] = 0.0
                        self.grounded = True
                        self.launched = False
                    else:
                        self.grounded = False
                else:
                    self.player_pos[1] = gh
                    self.player_vel[1] = 0.0
                    self.grounded = True
                    self.launched = False

            # Jump pads
            for jp in self.cfg["jump_pads"]:
                if xz_dist(self.player_pos, jp["pos"]) <= 1.0 and abs(self.player_pos[1] - jp["pos"][1]) <= 1.0:
                    if "target" in jp:
                        dx = jp["target"][0] - jp["pos"][0]
                        dz = jp["target"][2] - jp["pos"][2]
                        d = math.hypot(dx, dz) or 1.0
                        ux, uz = dx / d, dz / d
                    else:
                        ux, uz = jp["dir"][0], jp["dir"][1]
                    self.player_vel = [ux * jp["vh"], jp["vy"], uz * jp["vh"]]
                    self.grounded = False
                    self.launched = True
                    break

            # Fall check (Y < -10)
            if self.tuning["fall_enabled"] and not self.fall_triggered and self.player_pos[1] < -10.0:
                self.fall_triggered = True
                self.flames = max(0, self.flames - 1)
                lost_motes = self.carried
                self.carried = 0
                events.append({
                    "type": "event",
                    "tick": next_tick,
                    "name": "player_hit",
                    "data": {"by": "fall", "flames": self.flames, "dropped": 0, "lost": lost_motes},
                })
                if self.flames <= 0:
                    self.state = "lost"
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "game_over",
                        "data": {"result": "lost", "reason": "no_flames"},
                    })
                    self.tick = next_tick
                    return events
                self.fall_respawn_ticks = 60

        # 4. Pickup motes & charms (if not waiting to respawn)
        if self.fall_respawn_ticks == 0:
            cap = int(self.tuning["carry_capacity"])
            pr = float(self.tuning["pickup_radius"])
            rem_motes: list[Mote] = []
            for m in self.motes:
                if (
                    m.born_tick < next_tick
                    and self.carried < cap
                    and xz_dist(self.player_pos, m.pos) <= pr
                    and abs(self.player_pos[1] - m.pos[1]) <= 1.5
                ):
                    self.carried += 1
                    events.append({"type": "event", "tick": next_tick, "name": "mote_picked", "data": {"carried": self.carried}})
                else:
                    rem_motes.append(m)
            self.motes = rem_motes

            for c in self.charms:
                if c.available and xz_dist(self.player_pos, c.pos) <= pr and abs(self.player_pos[1] - c.pos[1]) <= 1.5:
                    c.available = False
                    c.respawn_ticks = 2700
                    self.charm_ticks = 600
                    events.append({"type": "event", "tick": next_tick, "name": "charm_picked", "data": {"charm_id": c.id, "charm_ticks": 600}})

        # 5. Interact with nearest unlit lantern
        if self.fall_respawn_ticks == 0 and self.curr_input.interact and not self.prev_input.interact:
            ir = float(self.tuning["interact_radius"])
            cost = int(self.tuning["lantern_cost"])
            cands = [l for l in self.lanterns if not l.lit and xz_dist(self.player_pos, l.pos) <= ir]
            if cands and self.carried > 0:
                target = min(cands, key=lambda l: (xz_dist(self.player_pos, l.pos), l.id))
                amt = min(self.carried, cost - target.deposited)
                if amt > 0:
                    self.carried -= amt
                    target.deposited += amt
                    self.score += amt * int(self.tuning["score"]["per_mote"])
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "deposit",
                        "data": {"lantern_id": target.id, "amount": amt, "deposited": target.deposited},
                    })
                    if target.deposited >= cost:
                        target.lit = True
                        target.just_lit_ticks = 30
                        self.score += int(self.tuning["score"]["per_lantern"])
                        events.append({"type": "event", "tick": next_tick, "name": "lantern_lit", "data": {"lantern_id": target.id}})

        # 6. Safe zones around lit lanterns
        safe_r = float(self.tuning["safe_radius"])
        for lan in self.lanterns:
            if not lan.lit:
                continue
            if lan.just_lit_ticks > 0:
                lan.just_lit_ticks -= 1
            for s in self.shades:
                dx = s.pos[0] - lan.pos[0]
                dz = s.pos[2] - lan.pos[2]
                d = math.hypot(dx, dz)
                if d < safe_r:
                    ux, uz = (dx / d, dz / d) if d > 1e-6 else (1.0, 0.0)
                    if lan.just_lit_ticks > 0:
                        step_out = min(safe_r - d + 0.01, (safe_r / 30.0) * 1.5)
                        s.pos[0] += ux * step_out
                        s.pos[2] += uz * step_out
                    else:
                        s.pos[0] = lan.pos[0] + ux * (safe_r + 0.01)
                        s.pos[2] = lan.pos[2] + uz * (safe_r + 0.01)

        # 7. Pulse (Tỏa Sáng)
        if self.fall_respawn_ticks == 0 and self.curr_input.pulse and not self.prev_input.pulse:
            p_cost = int(self.tuning["pulse_cost"])
            if self.pulse_cd_ticks == 0 and self.carried >= p_cost:
                self.carried -= p_cost
                self.pulse_cd_ticks = 180
                p_center = [self.player_pos[0], self.player_pos[1] + 0.8, self.player_pos[2]]
                p_rad = float(self.tuning["pulse_radius"])
                stunned_ids: list[str] = []
                for s in self.shades:
                    s_center = [s.pos[0], s.pos[1] + 0.8, s.pos[2]]
                    if dist_3d(p_center, s_center) <= p_rad or dist_3d(p_center, s.pos) <= p_rad:
                        s.state = "stunned"
                        s.state_ticks_left = 120
                        dx = s.pos[0] - self.player_pos[0]
                        dz = s.pos[2] - self.player_pos[2]
                        d = math.hypot(dx, dz)
                        ux, uz = (dx / d, dz / d) if d > 1e-6 else (1.0, 0.0)
                        s.push_vx = (ux * float(self.tuning["pulse_push_m"])) / 15.0
                        s.push_vz = (uz * float(self.tuning["pulse_push_m"])) / 15.0
                        s.push_ticks = 15
                        self.score += int(self.tuning["score"]["per_stun"])
                        stunned_ids.append(s.id)
                events.append({"type": "event", "tick": next_tick, "name": "pulse", "data": {"stunned_ids": stunned_ids}})

                for dr in self.drifters:
                    if dr.state == "removed":
                        continue
                    d_center = [dr.pos[0], dr.pos[1] + 0.8, dr.pos[2]]
                    if dist_3d(p_center, d_center) <= p_rad or dist_3d(p_center, dr.pos) <= p_rad:
                        if dr.state == "chase":
                            dr.state = "flee"
                            dr.state_ticks_left = 240
                        elif dr.state == "flee" and dr.stolen > 0:
                            dropped = dr.stolen
                            dr.stolen = 0
                            for _ in range(dropped):
                                self.motes.append(Mote(id=f"M{self._next_mseq()}", pos=list(dr.pos), kind="dropped", ttl_ticks=480, born_tick=next_tick))
                            dr.state_ticks_left = 120
                            events.append({"type": "event", "tick": next_tick, "name": "drifter_drop", "data": {"drifter_id": dr.id, "amount": dropped}})

        # 8. Move Shades & Drifters
        s_spd = float(self.cfg["shade_speed"])
        lit_lanterns = [l for l in self.lanterns if l.lit]
        for s in self.shades:
            if s.state == "spawning":
                continue
            if s.push_ticks > 0:
                s.pos[0] += s.push_vx
                s.pos[2] += s.push_vz
                s.push_ticks -= 1
            if s.state in ("stunned", "recoil"):
                if s.state == "recoil":
                    dx = s.pos[0] - self.player_pos[0]
                    dz = s.pos[2] - self.player_pos[2]
                    d = math.hypot(dx, dz)
                    ux, uz = (dx / d, dz / d) if d > 1e-6 else (1.0, 0.0)
                    s.pos[0] += ux * (2.0 / 60.0)
                    s.pos[2] += uz * (2.0 / 60.0)
                continue

            d_to_p = xz_dist(self.player_pos, s.pos)
            if s.state == "wander" and d_to_p <= 12.0:
                s.state = "chase"
            elif s.state == "chase" and d_to_p > 18.0:
                s.state = "wander"

            if s.state == "chase" and d_to_p > 1e-6:
                dx = self.player_pos[0] - s.pos[0]
                dz = self.player_pos[2] - s.pos[2]
                step_d = min(d_to_p, s_spd * DT)
                s.pos[0] += (dx / d_to_p) * step_d
                s.pos[2] += (dz / d_to_p) * step_d

            for lan in lit_lanterns:
                ldx = s.pos[0] - lan.pos[0]
                ldz = s.pos[2] - lan.pos[2]
                ld = math.hypot(ldx, ldz)
                if ld < safe_r:
                    ux, uz = (ldx / ld, ldz / ld) if ld > 1e-6 else (1.0, 0.0)
                    s.pos[0] = lan.pos[0] + ux * (safe_r + 0.01)
                    s.pos[2] = lan.pos[2] + uz * (safe_r + 0.01)

        for dr in self.drifters:
            if dr.born_tick >= next_tick or dr.state == "removed":
                continue
            d_to_p = xz_dist(self.player_pos, dr.pos)
            if dr.state == "idle":
                if self.carried >= 5 and d_to_p <= 15.0:
                    dr.state = "chase"
            elif dr.state == "chase":
                if self.carried < 5 or d_to_p > 15.0:
                    dr.state = "idle"
                elif d_to_p > 1e-6:
                    dx, dz = self.player_pos[0] - dr.pos[0], self.player_pos[2] - dr.pos[2]
                    step_d = min(d_to_p, 7.0 * DT)
                    dr.pos[0] += (dx / d_to_p) * step_d
                    dr.pos[2] += (dz / d_to_p) * step_d
            elif dr.state == "flee":
                dr.state_ticks_left -= 1
                dx, dz = dr.pos[0] - self.player_pos[0], dr.pos[2] - self.player_pos[2]
                d = math.hypot(dx, dz)
                ux, uz = (dx / d, dz / d) if d > 1e-6 else (1.0, 0.0)
                dr.pos[0] += ux * 7.0 * DT
                dr.pos[2] += uz * 7.0 * DT
                if dr.state_ticks_left <= 0:
                    dr.state = "removed"

        # 9. Collisions: Drifters steal first, then Shades hit (sorted by id)
        if self.fall_respawn_ticks == 0:
            for dr in sorted(self.drifters, key=lambda x: x.id):
                if dr.born_tick >= next_tick or dr.state != "chase" or dr.has_stolen:
                    continue
                if xz_dist(self.player_pos, dr.pos) <= 1.2 and self.carried > 0:
                    amt = min(3, self.carried)
                    self.carried -= amt
                    dr.stolen = amt
                    dr.has_stolen = True
                    dr.state = "flee"
                    dr.state_ticks_left = 240
                    events.append({
                        "type": "event",
                        "tick": next_tick,
                        "name": "drifter_steal",
                        "data": {"drifter_id": dr.id, "amount": amt, "carried": self.carried},
                    })

            if self.invuln_ticks == 0:
                hit_r = float(self.tuning["shade_hit_radius"])
                for s in sorted(self.shades, key=lambda x: x.id):
                    if s.state in ("spawning", "stunned", "recoil"):
                        continue
                    if xz_dist(self.player_pos, s.pos) <= hit_r and abs(self.player_pos[1] - s.pos[1]) <= 1.5:
                        self.flames = max(0, self.flames - 1)
                        dropped = self.carried // 2
                        self.carried -= dropped
                        self.invuln_ticks = 90
                        s.state = "recoil"
                        s.state_ticks_left = 60
                        for i in range(dropped):
                            ang = self.rng.uniform(0.0, 2.0 * math.pi)
                            rad = self.rng.uniform(1.5, 2.5)
                            mx = r3(self.player_pos[0] + rad * math.cos(ang))
                            mz = r3(self.player_pos[2] + rad * math.sin(ang))
                            self.motes.append(Mote(id=f"M{self._next_mseq()}", pos=[mx, self.player_pos[1], mz], kind="dropped", ttl_ticks=480, born_tick=next_tick))
                        events.append({
                            "type": "event",
                            "tick": next_tick,
                            "name": "player_hit",
                            "data": {"by": "shade", "flames": self.flames, "dropped": dropped},
                        })
                        break  # Max 1 flame lost per tick

        # 10. Scheduled spawns
        if self.random_motes and self.sim_tick % MOTE_SPAWN_INTERVAL == 0 and len(self.motes) < MAX_RANDOM_MOTES:
            occupied = {(round(m.pos[0], 1), round(m.pos[2], 1)) for m in self.motes}
            free = [p for p in self.cfg["mote_pts"] if (round(p[0], 1), round(p[2], 1)) not in occupied]
            if free:
                chosen = self.rng.choice(free)
                self.motes.append(Mote(id=f"M{self._next_mseq()}", pos=list(chosen), kind="random", born_tick=next_tick))

        if self.random_shades and self.sim_tick >= 300:
            interval = int(self.cfg["shade_interval"])
            max_s = int(self.cfg["max_shades"])
            to_spawn = 2 if self.sim_tick == 300 else (1 if (self.sim_tick - 300) % interval == 0 else 0)
            for _ in range(to_spawn):
                if len(self.shades) >= max_s:
                    break
                valid = [p for p in self.cfg["shade_pts"] if xz_dist(self.player_pos, p) >= 15.0]
                if valid:
                    chosen = self.rng.choice(valid)
                    self._shade_seq += 1
                    sid = f"S{self._shade_seq}"
                    self.shades.append(Shade(id=sid, pos=list(chosen), state="spawning", state_ticks_left=30))
                    events.append({"type": "event", "tick": next_tick, "name": "shade_spawned", "data": {"id": sid}})

        if self.random_drifters and self.sim_tick % DRIFTER_SPAWN_INTERVAL == 0:
            active_drifters = [d for d in self.drifters if d.state != "removed"]
            if len(active_drifters) < 2 and self.cfg["shade_pts"]:
                chosen = self.rng.choice(self.cfg["shade_pts"])
                self._drifter_seq += 1
                did = f"D{self._drifter_seq}"
                self.drifters.append(Drifter(id=did, pos=list(chosen), state="idle", born_tick=next_tick))

        # 11. Win/Loss check
        if self.flames <= 0:
            self.state = "lost"
            events.append({"type": "event", "tick": next_tick, "name": "game_over", "data": {"result": "lost", "reason": "no_flames"}})
        elif all(l.lit for l in self.lanterns):
            self.state = "won"
            self.score += int(self.time_left_s) * int(self.tuning["score"]["per_second_left"])
            self.score += self.flames * int(self.tuning["score"]["per_flame_left"])
            events.append({"type": "event", "tick": next_tick, "name": "game_over", "data": {"result": "won", "reason": "all_lit"}})
        elif self.time_left_s <= 0.0:
            self.state = "lost"
            events.append({"type": "event", "tick": next_tick, "name": "game_over", "data": {"result": "lost", "reason": "dawn"}})

        self.tick = next_tick
        return events
