# Changelog

## [v1.0.0 / Phase 4] — Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)
- **Contract version**: `1.2` → `1.3`, bổ sung `bench_cmd` (`python3 -m src.bench`) và `soak_cmd` (`python3 -m src.soak`).
- **Chế độ Benchmark (`src/bench.py`)**: Mở cửa sổ 1280×720 tắt vsync, cảnh Đêm 1 với 200 Bóng Mực `wander` + 100 đom đóm + L1–L3 sáng, camera bay vòng 30m trong 3s warmup + 30s đo FPS/RSS, xuất `bench.json`.
- **Soak Test (`src/soak.py`)**: Chạy 10 Đêm liên tiếp trong 1 tiến trình, kiểm tra rò rỉ bộ nhớ & ổn định, xuất `soak.json`.
- **Bảng xếp hạng cục bộ (`src/leaderboard.py`)**: Top 10 lưu trên đĩa (`data/leaderboard.json`), nhập tên 3–12 ký tự `[A-Za-z0-9_]`, hỗ trợ `python3 src/server.py --export-leaderboard out.json`.
- **Dễ tiếp cận (Accessibility)**: Đổi phím toàn bộ hành động kèm kiểm tra trùng phím, phụ đề & mũi tên chỉ hướng Bóng Mực, giảm chuyển động, cỡ chữ tối thiểu `18 px` và tùy chọn chữ lớn `×1.25`.

## [Phase 3] — Ticket-03 "Đèn cạn dầu" (Contract v1.2)
### Breaking Changes
- **Contract version**: `1.1` → `1.2`.
- **Thời lượng Đêm**: Đêm 1/2/3 giảm từ `300/330/360 s` xuống `240/270/300 s`.
- **Luật thắng (`all_lit` bị loại bỏ)**: Thắng (`dawn_survived`) khi sống sót tới hết giờ với số đèn sáng `>= ceil(0.6 × tổng đèn)`.
- **Nhiên liệu đèn & Bóng Mực hút dầu**: Đèn sáng có `fuel = 100`, tự hao `1/s`, hết dầu tắt (`lantern_out`), thắp lại chỉ tốn `5`. Bóng Mực `wander` hút `5/s` (`drain`) ở đèn `fuel < 30`.
- **Sức chứa tăng dần & Điểm mới**: `capacity = min(20, 10 + 2 × successful_lights)`; `+5` nạp đom đóm, `+100` thắp mới, `+40` thắp lại, `+5/+15` Tỏa Sáng, `+50 + floor(fuel)` mỗi đèn sáng lúc bình minh.

## [Phase 2] — Ticket-02 "Ba hòn đảo" (Contract v1.1)
- Chuẩn hóa số liệu, mở rộng 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), thêm Lướt (`dash`), Gió Lạc (`drifters`), Bùa Gió (`charms`), Tạm dừng (`paused`/`resumed`).

## [Phase 1] — PRD-0 (Contract v1.0)
- Bản chơi được Đêm 1 (Đảo Bến) + chế độ headless tất định.
