# Bằng chứng kiểm chứng Phase 1 (`phase-1`)

## 1. Bảng truy vết yêu cầu → bằng chứng

| Yêu cầu (PRD-0 & Contract v1.0) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` đúng schema & thông số | `test_contract_schema` | `tests/test_contract_p1.py` | Đạt |
| Logic 60Hz, `tick 0` trước input, `time_left_s`, xoay `move` theo `cam_yaw_deg`, chuẩn hóa vector | `test_tick_model_and_camera_yaw_movement`, `test_move_vector_clamped_to_unit_length` | `pytest -v` (7/7 PASSED) | Đạt |
| Nhặt đom đóm, nạp đèn, thắp đủ 5 đèn → thắng (`all_lit`) | `test_pickup_deposit_and_win` | `pytest -v` | Đạt |
| Tỏa sáng (Pulse) làm choáng & đẩy Bóng Mực, `safe_radius` quanh đèn đã thắp | `test_pulse_stuns_pushes_and_lit_lantern_safe_radius` | `pytest -v` | Đạt |
| Chạm Bóng Mực mất lửa, rơi đom đóm, hết lửa → thua (`no_flames`) | `test_shade_hit_drops_motes_and_can_lose` | `pytest -v` | Đạt |
| Tính tất định headless & mã thoát `2` khi `inputs` sai định dạng | `test_headless_determinism_and_bad_input_exit_code` + chạy CLI 2 lần `--seed 42 --ticks 300` | SHA256 trùng khớp: `BB571DB2979B95A54175A84788923AB563353F8801D6CBD0734DED811ADE2044` (`p1_run1.jsonl`, `p1_run2.jsonl`) | Đạt |
| Giao diện 3D Đảo Bến (Mây đội nón lá có đèn, 5 Đèn Lớn, đom đóm, Bóng Mực, HUD, chơi lại) | Chạy `python src/server.py` | `web/index.html`, `web/game.js`, `src/server.py` | Đã dựng, chờ người dùng chơi thử trực tiếp trên trình duyệt |

## 2. Kết quả chạy lệnh thật
```text
$ python -m py_compile src/sim.py src/headless.py src/server.py
(exit code 0)

$ python -m pytest -v
7 passed in 0.47s

$ python -m src.headless --seed 42 --night 1 --ticks 300 --out docs/proof/p1_run1.jsonl
$ python -m src.headless --seed 42 --night 1 --ticks 300 --out docs/proof/p1_run2.jsonl
SHA256(p1_run1.jsonl) = BB571DB2979B95A54175A84788923AB563353F8801D6CBD0734DED811ADE2044
SHA256(p1_run2.jsonl) = BB571DB2979B95A54175A84788923AB563353F8801D6CBD0734DED811ADE2044
```

## 3. Đánh giá nhanh Phase 1
- **Đạt**: Toàn bộ Test Contract v1.0, headless CLI, CI workflow, harness (`AGENTS.md` + skill `verify-phase`), game 3D Three.js offline.
- **Lưu ý / Chưa kiểm chứng tự động**: Giao diện WebGL 3D (`web/game.js`) chưa được mở qua trình duyệt tự động trong phiên này do chưa có `chrome_devtools` MCP; cần mở `python src/server.py` để kiểm tra hình ảnh trực tiếp và chuẩn bị cho Phase 2.
