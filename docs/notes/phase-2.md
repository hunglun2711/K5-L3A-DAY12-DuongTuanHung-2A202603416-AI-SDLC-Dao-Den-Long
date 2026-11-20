# Phase 2 Notes — Ticket-02 ("Ba hòn đảo") & Contract v1.1

## 1. Thay đổi so với Phase 1 (Chuẩn hóa & Cập nhật test)
- **Số liệu chuẩn**: `player_speed` `7.0 -> 6.0`, `carry_capacity` `5 -> 10`, `lantern_cost` `3 -> 10`, `pickup_radius` `1.8 -> 1.0`, `interact_radius` `2.5 -> 2.0`, `pulse_cost` `1 -> 3`, `pulse_radius` `6.0 -> 5.0`, `pulse_stun_s` `3.0 -> 2.0`, `pulse_cooldown_s` `1.5 -> 3.0`, `safe_radius` `5.0 -> 6.0`, `shade_speed` `4.2 -> 4.0` (Đêm 3: `4.5`), `shade_hit_radius` `1.2 -> 1.0`, `night1_duration_s` `180 -> 300`, `per_stun` `25 -> 5`.
- **Điểm đom đóm**: Ticket-02 quy định `+10 mỗi đom đóm nạp` (thay vì lúc nhặt ở Phase 1).
- **Test Phase 1 cũ (`tests/test_contract_p1.py`)**: Cập nhật `test_pickup_deposit_and_win` và `test_pulse_stuns_pushes_and_lit_lantern_safe_radius` cho khớp `lantern_cost = 10` và `pulse_cost = 3` (giữ nguyên toàn bộ tinh thần regression test, ghi rõ lý do thay đổi).

## 2. Spec & Acceptance Criteria (Phần 3)
| Tính năng | Tiêu chí nghiệm thu (Acceptance Criteria) |
|---|---|
| **Lướt (Dash)** | Nhấn `dash` (edge-trigger) lướt `14 m/s` trong `12` tick (`0.2s`), hồi chiêu `90` tick (`1.5s`), giữ nguyên độ cao Y, phát sự kiện `dash`. |
| **Gió Lạc (Drifters)** | Xuất hiện Đêm 2 & 3 tại tick `1200, 2400...` (tối đa 2). `idle -> chase` khi Mây mang `>= 5` và cách `<= 15m`; chạm (`<= 1.2m`) cướp `min(3, carried)` (`drifter_steal`) rồi `flee` 240 tick. Trúng Tỏa Sáng khi `flee` thả lại toàn bộ đom đóm (`drifter_drop`). |
| **Bùa Gió (Charms)** | Nhặt ở Đêm 2 `(35,0,0)` hoặc Đêm 3 `(±30,0,25)` phát `charm_picked`, hiệu lực `600` tick: chạy `7.2 m/s`, Lướt không hồi chiêu; hồi sinh sau `2700` tick. |
| **Đêm 2 — Đảo Cau** | 2 đảo `r=28` tại `(0,0,0)` & `(70,0,0)`, cầu tre `x∈[26,44], z∈[-2,2]`, 2 bục nhảy `(20,0,18)` & `(50,0,-18)` phóng `vy=14, vh=24` sang đảo kia, 6 đèn `L1..L6`. |
| **Đêm 3 — Đảo Chuông** | Đảo `r=45` 3 tầng (`Y=0, 3, 6`), 2 dốc `30° & 150°`, bục nhảy `(0,3,13)` lên tầng 2, tháp chuông `r=2`, 7 đèn `L1..L7`, gió mạnh mỗi 30s đẩy `2 m/s` trong 5s. |
| **Tạm dừng (`Esc`/`P`)** | `tick` tăng nhưng `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot `state: "paused"`, phát `paused` / `resumed`. |
| **Chuỗi 3 Đêm & UI** | Menu chính -> lời Ông Đăng -> Đêm 1 -> 2 -> 3 -> màn Bình Minh; cài đặt âm lượng & độ nhạy chuột lưu `localStorage`; bảng màu chuẩn & HUD đầy đủ. |

## 3. Nhật ký dùng AI & Ước tính Token (Phase 2)
- **Công cụ**: Antigravity (Gemini 4 Hydrogen Medium).
- **Ước tính token Phase 2**: ~26k input tokens, ~14k output tokens.
- **Tiết kiệm**: Dùng chung cấu trúc `GameSim` cho cả 3 Đêm bằng bảng cấu hình bản đồ/thông số theo đêm, tránh lặp code.
