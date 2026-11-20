# Đảo Đèn Lồng — Ba Hòn Đảo (Phase 2, Contract v1.1)

Game 3D góc nhìn thứ ba chạy trên trình duyệt (Three.js) kèm engine mô phỏng thuần Python 60Hz và chế độ headless tuân theo **Test Contract v1.1**. Chạy được trên **Windows, macOS và Linux** mà không cần cài thêm thư viện đồ họa hay internet.

## Cài đặt & Chạy game (tối đa 3 lệnh)

```bash
git clone https://github.com/hunglun2711/K5-L3A-DAY12-DuongTuanHung-2A202603416-AI-SDLC-Dao-Den-Long.git
cd K5-L3A-DAY12-DuongTuanHung-2A202603416-AI-SDLC-Dao-Den-Long
python3 src/server.py
```
*(Trên Windows dùng `python src/server.py`. Trình duyệt sẽ tự mở tại `http://127.0.0.1:8080`.)*

## Điều khiển
- `W A S D` / `Phím mũi tên`: Di chuyển Mây theo hướng camera
- `Space`: Nhảy
- `Shift` / `K`: Lướt (Dash `14 m/s`)
- `E` / `Enter`: Nạp đom đóm vào Đèn Lồng Lớn gần nhất
- `Q` / `F`: Tỏa sáng (Pulse) xua Bóng Mực & Gió Lạc (tốn `3` đom đóm)
- `Esc` / `P`: Tạm dừng (Pause)
- `Kéo chuột`: Xoay camera 3D

## Cách tính điểm (chuẩn hóa v1.1)
- Nạp 1 đom đóm vào đèn: `+10` điểm
- Thắp sáng 1 Đèn Lồng Lớn (`10` đom đóm): `+100` điểm
- Tỏa Sáng trúng 1 Bóng Mực: `+5` điểm
- Thưởng khi thắng mỗi Đêm: `+ floor(giây còn lại) × 2 + 50 × Ngọn Lửa còn lại`

## Chạy kiểm thử & chế độ Headless (Test Contract v1.1)
```bash
python3 -m pytest -v
python3 -m src.headless --seed 42 --night 3 --ticks 21600 --out out.jsonl
```

## Sáng tạo của tôi
- **Âm thanh tổng hợp (Web Audio API)**: Tự tổng hợp hiệu ứng nhặt đom đóm, thắp đèn, tỏa sáng, nhảy, lướt, va chạm và cảnh báo ngay trên trình duyệt, kèm tùy chỉnh âm lượng & độ nhạy chuột lưu vào `localStorage`.
- Toàn bộ phần hiển thị/âm thanh nằm ở `web/game.js`, không ảnh hưởng đầu ra headless của `src/sim.py`.

## Bằng chứng & Tài liệu
- Ghi chép & Acceptance Criteria Phase 2: [docs/notes/phase-2.md](docs/notes/phase-2.md)
- Bằng chứng kiểm chứng Phase 2: [docs/proof/phase-2-proof.md](docs/proof/phase-2-proof.md)
- Bản quyền & nguồn: [LICENSE](LICENSE), [CREDITS.md](CREDITS.md)
