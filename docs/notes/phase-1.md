# Phase 1 Notes — PRD-0 & Test Contract v1.0

## 1. Yêu cầu bắt buộc vs Chỗ mơ hồ & Giả định
| Mục | Nội dung PRD-0 | Giả định cụ thể (khớp `game.contract.json`) |
|---|---|---|
| Kích thước đảo | Hòn đảo tròn Đảo Bến | Bán kính `32.0` m, tâm `(0, 0, 0)`, mặt đất `Y = 0`. Rơi khỏi đảo (`r > 32.0`) mất 1 ngọn lửa và hồi sinh tại `(0, 0, 0)` (`fall_enabled: true`). |
| 5 Đèn Lồng Lớn | 5 đèn trên đảo | Đặt đều trên vòng tròn bán kính `20.0` m (`L1`..`L5`), mỗi đèn cần `lantern_cost = 3` đom đóm. |
| Tốc độ & sức chứa | Đi lại, nhảy, nhặt đom đóm | `player_speed = 7.0` m/s, `carry_capacity = 5`, `pickup_radius = 1.8` m, `interact_radius = 2.5` m. |
| Máu & va chạm | Mất máu khi chạm Bóng Mực | `flames = 3`, `invuln_s = 1.5` s, `hit_drop_ratio = 0.5` (làm tròn xuống `int(carried * 0.5)`). |
| Tỏa sáng (Pulse) | Xua Bóng Mực, tốn ánh sáng | `pulse_cost = 1`, `pulse_radius = 6.0` m, `pulse_stun_s = 3.0` s, `pulse_push_m = 4.0` m, `pulse_cooldown_s = 1.5` s. |
| Bóng Mực | Đuổi Mây, sợ đèn đã thắp | `shade_speed = 4.2` m/s, `shade_hit_radius = 1.2` m, `safe_radius = 5.0` m quanh đèn đã thắp. |
| Thời lượng & Điểm | Thắng khi thắp hết 5 đèn, thua khi hết lửa hoặc hết giờ | `night1_duration_s = 180` s. Điểm: `per_mote = 10`, `per_lantern = 100`, `per_stun = 25`, `per_second_left = 2`, `per_flame_left = 50`. |

## 2. Kế hoạch kiểm chứng (trước khi code)
1. **Unit & Contract Tests (`tests/test_contract_p1.py`)**:
   - Đọc `game.contract.json` và kiểm tra đầy đủ schema + kiểu dữ liệu.
   - Kiểm tra mô hình tick (`tick 0` trước input, `N` bước cho `tick N`, `time_left_s`).
   - Kiểm tra biến đổi vector di chuyển theo `cam_yaw_deg` và chuẩn hóa khi độ dài > 1.
   - Kiểm tra edge-trigger cho `interact`, `pulse`, `jump`.
   - Kiểm tra kịch bản: nhặt đom đóm, nạp đèn, thắp đèn -> thắng (`all_lit`), pulse đẩy & làm choáng Bóng Mực, Bóng Mực bị chặn ngoài `safe_radius` của đèn đã thắp, chạm Bóng Mực mất máu & rơi đom đóm, hết máu -> thua (`no_flames`), hết giờ -> thua (`dawn`), rơi khỏi đảo (`fall`).
   - Kiểm tra tính tất định: chạy headless 2 lần cùng `--seed`, `--scenario`, `--inputs` phải ra file JSONL giống hệt nhau từng byte.
   - Kiểm tra mã thoát: `2` khi file `inputs`/`scenario` lỗi định dạng.

## 3. Nhật ký dùng AI & Ước tính Token (Phase 1)
- **Công cụ**: Antigravity (Gemini 4 Hydrogen Medium).
- **Cách tiết kiệm token**:
  - Đọc toàn bộ tài liệu hướng dẫn một lượt, tách rõ phần logic thuần (`src/sim.py`) khỏi phần đồ họa WebGL (`web/`) để viết và test nhanh không cần render.
  - Định nghĩa `AGENTS.md` ngắn gọn (~20 dòng) và skill `.agents/skills/verify-phase/SKILL.md` để tái sử dụng.
- **Ước tính token Phase 1**: ~18k input tokens, ~9k output tokens (tiết kiệm nhờ batch tool calls và dùng Python stdlib cho engine headless).
