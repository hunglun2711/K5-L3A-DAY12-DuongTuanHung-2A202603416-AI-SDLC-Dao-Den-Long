# Bằng chứng kiểm chứng Phase 4 (`phase-4` / `v1.0.0`)

## 1. Bảng truy vết yêu cầu → bằng chứng

| Yêu cầu (Ticket-04 & Contract v1.3) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` v1.3 (`bench_cmd`, `soak_cmd`) | `test_contract_v1_3_schema` | `tests/test_contract_p4.py` | Đạt |
| Benchmark 1280×720, 200 Bóng Mực `wander`, 100 đom đóm, L1–L3 sáng, 30s | `python -m src.bench --seed 42 --duration 30 --out bench.json` | [bench.json](../../bench.json): `avg_fps = 60.0`, `p1_low_fps = 52.6`, `load_ms = 152`, `frames = 1799` | Đạt |
| Soak test 10 Đêm liên tiếp (`--seed 7 --nights 10`) | `python -m src.soak --seed 7 --nights 10 --out soak.json` | [soak.json](../../soak.json): `crashes = 0`, `mem_start_mb = 19.88`, `mem_end_mb = 19.92`, `duration_s = 1.05` | Đạt |
| Bảng xếp hạng cục bộ & `--export-leaderboard` | `test_leaderboard_ordering_and_export` | `tests/test_contract_p4.py`, `src/leaderboard.py` | Đạt |
| Dễ tiếp cận (đổi phím + trùng phím, phụ đề + mũi tên, giảm chuyển động, chữ ≥ 18px + ×1.25) | Kiểm tra mã nguồn `web/index.html`, `web/game.js` | Đã cài đặt & lưu `localStorage` | Đạt |
| Regression toàn bộ Phase 1–3 | `python -m pytest -v` | 20/20 PASSED in 1.06s | Đạt |
| Đóng gói bản phát hành & Retro | `dist/dao-den-long-v1.0.0.zip`, `docs/notes/retro.md` | Đã tạo & kiểm tra | Đạt |

## 2. Kết quả chạy lệnh thật
```text
$ python -m pytest -v
20 passed in 1.06s

$ python -m src.soak --seed 7 --nights 10 --out soak.json
nights: 10, crashes: 0, mem_start_mb: 19.88, mem_end_mb: 19.92, duration_s: 1.05

$ python -m src.bench --seed 42 --duration 30 --out bench.json
avg_fps: 60.0, p1_low_fps: 52.6, frame_ms_p95: 16.8, frames: 1799, load_ms: 152, peak_mem_mb: 827.1
```
