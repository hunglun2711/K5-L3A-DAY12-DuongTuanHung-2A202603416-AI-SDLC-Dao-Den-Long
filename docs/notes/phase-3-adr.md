# ADR-01: Chuyển đổi mô hình Đèn cạn dầu, Bóng Mực hút dầu & Luật thắng Bình Minh (Phase 3)

- **Trạng thái**: Đã áp dụng (Phase 3 — Ticket-03, Contract v1.2)
- **Bối cảnh**: Ở Phase 1–2, đèn thắp xong giữ sáng vĩnh viễn và game kết thúc ngay khi thắp đủ đèn (`all_lit`), khiến cuối Đêm thiếu áp lực. Ticket-03 thay thế luật này bằng cơ chế giữ đảo sáng tới bình minh.

## Quyết định thiết kế
1. **Biểu diễn nhiên liệu đèn bằng số nguyên `1/60` (`fuel_units`)**:
   - Thay vì trừ `1/60` và `5/60` bằng `float` gây sai số tích lũy qua hàng nghìn tick, mỗi đèn lưu `fuel_units` nguyên (`6000 = 100.0` fuel).
   - Mỗi tick đèn sáng trừ `1` (`1.0/s`), mỗi Bóng Mực ở trạng thái `drain` trừ thêm `5` (`5.0/s`). Khi xuất JSONL mới chia `60.0` và làm tròn `1` chữ số thập phân.
2. **Vòng đời đèn & Sức chứa tăng dần**:
   - Bổ sung `ever_lit`, `relit_count` trên `Lantern` và `successful_lights` trên `GameSim` (chỉ tăng khi người chơi thắp thành công trong Đêm, không tính đèn dựng sẵn từ `scenario`).
   - Đèn tắt do cạn dầu (`fuel_units <= 0`) phát `lantern_out`, giữ `ever_lit = true`, và lần thắp lại chỉ tốn `5` đom đóm (`relight_cost`).
3. **Luật thắng mới (`dawn_survived`)**:
   - Bỏ điều kiện thắng sớm `all_lit`. Tại bước xét thắng/thua cuối tick: kiểm tra `flames <= 0 -> no_flames` trước, sau đó nếu `time_left_s <= 0`: đạt ngưỡng `lit_count >= ceil(0.6 * total_lanterns)` thì thắng (`dawn_survived`), ngược lại thua (`dawn`).

## Hệ quả lên Test cũ
- `tests/test_contract_p1.py::test_pickup_deposit_and_win` trước đây kiểm tra thắng sớm ngay khi thắp đủ 5 đèn (`all_lit`) — đã được cập nhật để kiểm tra `lantern_lit`, `refuel`, và thắng `dawn_survived` khi hết giờ với `>= 3/5` đèn sáng.
