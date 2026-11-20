# Bằng chứng kiểm chứng Phase 3 (`phase-3`)

## 1. Bảng truy vết yêu cầu → bằng chứng

| Yêu cầu (Ticket-03 & Contract v1.2) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Nhiên liệu đèn (`1/60` mỗi tick), tắt đèn (`lantern_out`), thắp lại tốn `5` (`relight: true`, `+40`) | `test_fuel_decay_lantern_out_and_relight_cost_5` | `tests/test_contract_p3.py` | Đạt |
| Châm dầu (`refuel`) & sức chứa tăng dần (`10 + 2 × successful_lights`) | `test_refuel_partial_lantern`, `test_fuel_decay_lantern_out_and_relight_cost_5` | `tests/test_contract_p3.py` | Đạt |
| Bóng Mực hút dầu (`drain`, `5/s`, `fuel_drain`) & Tỏa Sáng `+15` | `test_shade_drain_and_pulse_bonus_15` | `tests/test_contract_p3.py` | Đạt |
| Luật thắng mới `dawn_survived` (`>= 60%` đèn sáng lúc bình minh) & thua `dawn` | `test_pickup_deposit_and_win`, `test_dawn_loss_below_threshold` | `tests/test_contract_p1.py`, `tests/test_contract_p3.py` | Đạt |
| Regression Phase 1–2 (13 test cũ) | `python -m pytest -v` | 17/17 PASSED | Đạt |
| Tính tất định Đêm 1 (`--seed 42 --ticks 600`) | So sánh SHA256 2 lần chạy (`p3_n1_r1.jsonl`, `p3_n1_r2.jsonl`) | `D8B9A021BBFE2692734EB5C7932C669008D6D2334047AA5817070E907CAC2F6D` | Đạt |
| Chế độ mù màu (`#00B3FF`, `#FFFFFF` + `⚠`, đèn tắt xẹp 20%, nhấp nháy 1Hz) | Kiểm tra mã nguồn `web/index.html`, `web/game.js` | Đã cài đặt & lưu `localStorage` | Đã dựng |

## 2. Kết quả chạy lệnh thật
```text
$ python -m py_compile src/sim.py src/headless.py src/server.py
(exit code 0)

$ python -m pytest -v
17 passed in 1.72s
```
