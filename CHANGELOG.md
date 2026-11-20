# Changelog

## [Phase 3] — Ticket-03 "Đèn cạn dầu" (Contract v1.2)
### Breaking Changes (Thay đổi phá vỡ tương thích)
- **Contract version**: `1.1` → `1.2`.
- **Thời lượng Đêm**: Đêm 1/2/3 giảm từ `300/330/360 s` xuống `240/270/300 s`.
- **Luật thắng (`all_lit` bị loại bỏ)**: Thắp đủ đèn không còn kết thúc Đêm sớm. Người chơi thắng (`dawn_survived`) khi sống sót tới hết giờ với số đèn sáng `>= ceil(0.6 × tổng đèn)`.
- **Nhiên liệu đèn & Châm dầu**: Đèn sáng có `fuel = 100`, tự hao `1/s`, hết dầu sẽ tắt (`lantern_out`) và nhớ `ever_lit = true` (thắp lại chỉ tốn `5` đom đóm).
- **Vùng an toàn & Bóng Mực `drain`**: Đèn có `fuel < 30` mất vùng an toàn `6 m`; Bóng Mực `wander` sẽ tìm tới đèn yếu/tắt và chuyển sang `drain` hút `5 fuel/s` (`fuel_drain`). Hết choáng quay về `wander`.
- **Công thức điểm mới**: `+5` mỗi đom đóm nạp, `+100` thắp lần đầu, `+40` thắp lại, `+5` Tỏa Sáng trúng Bóng Mực (`+15` nếu đang `drain`), thắng bình minh `+50 + floor(fuel)` mỗi đèn sáng và `+50` mỗi Ngọn Lửa (bỏ thưởng thời gian).
- **Sức chứa tăng dần**: `capacity = min(20, 10 + 2 × successful_lights)`.

## [Phase 2] — Ticket-02 "Ba hòn đảo" (Contract v1.1)
- Chuẩn hóa số liệu, mở rộng 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), thêm Lướt (`dash`), Gió Lạc (`drifters`), Bùa Gió (`charms`), Tạm dừng (`paused`/`resumed`).

## [Phase 1] — PRD-0 (Contract v1.0)
- Bản chơi được Đêm 1 (Đảo Bến) + chế độ headless tất định.
