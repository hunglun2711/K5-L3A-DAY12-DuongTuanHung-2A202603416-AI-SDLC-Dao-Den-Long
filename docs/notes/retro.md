# Retro & Đánh giá tổng hợp 4 Phase — Đảo Đèn Lồng

## 1. Đánh giá từng Phase (Evaluation)
| Phase | Yêu cầu đạt | Hồi quy phase trước | Điều chỉnh chính |
|---|---|---|---|
| **Phase 1 (PRD-0, v1.0)** | Đêm 1 Đảo Bến, 3D Three.js offline, headless 60Hz tất định, 7/7 test | — | Chọn Python stdlib cho `src/sim.py` để tách logic khỏi WebGL. |
| **Phase 2 (Ticket-02, v1.1)** | Chuẩn hóa số liệu, 3 Đêm, Dash, Gió Lạc, Bùa Gió, Pause, 13/13 test | Cập nhật 2 test Phase 1 theo số liệu chuẩn | Sửa lỗi buffering phím `E` trên WebGL và góc dốc Đêm 3. |
| **Phase 3 (Ticket-03, v1.2)** | Đèn cạn dầu (`fuel_units` nguyên `1/60`), Bóng Mực `drain`, `dawn_survived`, mù màu, 17/17 test | Thay `all_lit` bằng `dawn_survived` trong test P1 (ghi ADR-01) | Dùng số nguyên `1/60` (`6000 = 100.0`) để triệt tiêu sai số `float`. |
| **Phase 4 (Ticket-04, v1.3)** | Benchmark 1280×720, Soak 10 Đêm, Leaderboard cục bộ, Accessibility, 20/20 test | Cập nhật `contract_version == "1.3"` | Đóng gói `dist/` + Release `v1.0.0`. |

## 2. Điều gì hiệu quả / chưa hiệu quả khi làm với AI
- **Hiệu quả**: Tách `src/sim.py` (pure Python) khỏi `web/game.js` giúp viết test tự động cực nhanh (`20 passed in ~1s`), kiểm chứng tính tất định bằng SHA256 và chạy 21.600 tick trong ~1.3s.
- **Chưa hiệu quả**: Ở Phase 2, phần giao diện 3D (`web/game.js`) ban đầu đọc phím trực tiếp bằng `keys['KeyE']` ở 60Hz nên bấm nhanh bị lọt; cần test chơi thật trên trình duyệt mới phát hiện được.

## 3. Những lần AI sai & Cách phát hiện + Chỉnh Harness
1. **Sai thứ tự Euler trên dốc Đêm 3**: AI dùng thứ tự mặc định `'XYZ'` khiến ván dốc bị nghiêng ngược. Phát hiện khi chơi thử trên trình duyệt; sửa bằng `rotation.order = 'YXZ'`.
2. **Test `safe_radius` đặt đèn quá gần**: AI đặt đèn `lit: true` tại `z=10` (`safe_radius=6` chặn tại `z=4`) nhưng lại assert Bóng Mực bị đẩy qua `z > 6.5`. Pytest báo fail ngay giúp phát hiện lỗi test.
3. **Chỉnh Harness**: Thêm quy tắc bắt buộc trong `AGENTS.md` về tính `fuel` bằng số nguyên `1/60` (`fuel_units`), quy tắc không sửa tay output, và skill `verify-phase` chạy compile + pytest + determinism + benchmark.

## 4. Ước tính Token & Cách tiết kiệm
| Phase | Input tokens (ước tính) | Output tokens (ước tính) | Ghi chú |
|---|---:|---:|---|
| Phase 1 | ~18k | ~9k | Thiết kế lõi `src/sim.py`, WebGL Đêm 1, harness & 7 tests |
| Phase 2 | ~26k | ~14k | Mở rộng 3 Đêm, Dash, Gió Lạc, Bùa Gió, Pause & 6 tests mới |
| Phase 3 | ~24k | ~11k | Cơ chế nhiên liệu nguyên `1/60`, `drain`, `dawn_survived`, ADR-01 |
| Phase 4 | ~37k | ~14k | Benchmark, Soak, Leaderboard, Accessibility, Retro & đóng gói |
| **Tổng** | **~105k** | **~48k** | **Model: Gemini 4 Hydrogen Medium** |

- **Cách tiết kiệm**: Giữ `AGENTS.md` ngắn (~15 dòng), batch nhiều thao tác đọc/sửa song song, dùng Python stdlib không cài framework nặng, chỉ gửi phần diff/hàm cần sửa.

## 5. Nếu làm lại thì đổi gì?
- Dùng chung một nguồn code duy nhất cho cả headless và WebGL (ví dụ biên dịch/chạy `src/sim.py` qua Pyodide hoặc WebSocket 60Hz) để không bao giờ phải đồng bộ tay giữa `src/sim.py` và `web/game.js`.
- Tự động hóa kiểm tra trình duyệt (Playwright/Chrome DevTools) ngay từ Phase 1.
