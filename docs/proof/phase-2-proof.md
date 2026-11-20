# Bằng chứng kiểm chứng Phase 2 (`phase-2`)

## 1. Bảng truy vết yêu cầu → bằng chứng

| Yêu cầu (Ticket-02 & Contract v1.1) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Chuẩn hóa `game.contract.json` v1.1 & regression Phase 1 | `pytest tests/test_contract_p1.py` | 7/7 PASSED | Đạt |
| Lướt (`dash`: 14 m/s, 12 tick, CD 90 tick) | `test_dash_and_cooldown` | `tests/test_contract_p2.py` | Đạt |
| Tạm dừng (`pause` / `resumed`, đóng băng `sim_tick`) | `test_pause_freezes_sim_tick_and_time` | `tests/test_contract_p2.py` | Đạt |
| Gió Lạc (`drifter_steal`, `flee`, `drifter_drop`) | `test_drifter_steal_and_pulse_drop` | `tests/test_contract_p2.py` | Đạt |
| Bùa Gió (`charm_picked`, 7.2 m/s, 0 CD lướt) | `test_charm_boosts_speed_and_removes_dash_cooldown` | `tests/test_contract_p2.py` | Đạt |
| Bản đồ Đêm 2 (Đảo Cau) & Đêm 3 (Đảo Chuông) | `test_night2_jump_pad_and_night3_ramp` | `tests/test_contract_p2.py` | Đạt |
| Tính tất định Đêm 2 (`--seed 42 --ticks 600`) | So sánh SHA256 2 lần chạy (`p2_n2_r1.jsonl`, `p2_n2_r2.jsonl`) | `4EF4B20BB584FB275C47EE8507FDA73C42AB7BEA030AB242B09D76F72732F241` | Đạt |
| Hiệu năng headless 21.600 tick (`<= 30s`) | `Measure-Command` chạy `--night 3 --ticks 21600` | `1.27 giây` | Đạt |
| Giao diện 3D 3 Đêm, HUD đầy đủ, bảng màu chuẩn, Menu/Pause/Cài đặt | `web/index.html`, `web/game.js` | Đã dựng, cần mở trình duyệt để kiểm tra trực quan | Đã dựng |

## 2. Kết quả chạy lệnh thật
```text
$ python -m py_compile src/sim.py src/headless.py src/server.py
(exit code 0)

$ python -m pytest -v
13 passed in 1.43s

$ Measure-Command { python -m src.headless --seed 1 --night 3 --ticks 21600 --out docs/proof/p2_n3_full.jsonl }
TotalSeconds: 1.2658081
```
