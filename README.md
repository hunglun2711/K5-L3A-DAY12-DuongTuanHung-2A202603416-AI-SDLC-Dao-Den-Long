# Đảo Đèn Lồng — Bình Minh (v1.0.0, Contract v1.3)

> **Video demo:** Xem tại [GitHub Release v1.0.0](https://github.com/hunglun2711/K5-L3A-DAY12-DuongTuanHung-2A202603416-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0) (hoặc `docs/demo/demo.mp4`).

Game 3D góc nhìn thứ ba chạy trên trình duyệt (Three.js) kèm engine mô phỏng thuần Python 60Hz tuân theo **Test Contract v1.3**. Chạy được trên **Windows, macOS và Linux**.

## Yêu cầu hệ thống
- Python `3.10+` (đã kiểm chứng trên Python `3.14.4`), `pytest` (để chạy test), `psutil` (tùy chọn để đo RSS), và trình duyệt hỗ trợ WebGL2 (Chrome / Edge / Firefox / Safari).
- Lưu ý trình duyệt: Chế độ benchmark cố gắng tắt vsync bằng cờ `--disable-gpu-vsync` của Chromium/Chrome/Edge.

## Cài đặt & Chạy game (tối đa 3 lệnh)
```bash
git clone https://github.com/hunglun2711/K5-L3A-DAY12-DuongTuanHung-2A202603416-AI-SDLC-Dao-Den-Long.git
cd K5-L3A-DAY12-DuongTuanHung-2A202603416-AI-SDLC-Dao-Den-Long
python3 src/server.py
```
*(Trên Windows dùng `python src/server.py`. Trình duyệt tự mở tại `http://127.0.0.1:8080`.)*

## Điều khiển mặc định (có thể đổi phím trong Cài đặt)
- `W A S D` / `Mũi tên`: Di chuyển Mây
- `Space`: Nhảy · `Shift` (trái): Lướt (`14 m/s`)
- `E` / `Enter`: Thắp đèn hoặc châm dầu
- `Q`: Tỏa Sáng (`3` đom đóm) xua Bóng Mực & Gió Lạc
- `Esc` / `P`: Tạm dừng · `Kéo chuột`: Xoay camera 3D

## Chạy Kiểm thử, Headless, Benchmark, Soak & Xuất Bảng xếp hạng
```bash
python3 -m pytest -v
python3 -m src.headless --seed 42 --night 1 --ticks 600 --out out.jsonl
python3 -m src.bench --seed 42 --duration 30 --out bench.json
python3 -m src.soak --seed 7 --nights 10 --out soak.json
python3 src/server.py --export-leaderboard leaderboard_export.json
```

## Sáng tạo của tôi
- **Âm thanh tổng hợp Web Audio API** + **biển mây trôi & vòng an toàn vàng** quanh các Đèn Lồng Lớn sáng (tắt hoàn toàn trong chế độ headless và benchmark).

## Tài liệu & Bằng chứng
- ADR-01: [docs/notes/phase-3-adr.md](docs/notes/phase-3-adr.md) · Retro: [docs/notes/retro.md](docs/notes/retro.md)
- Bằng chứng: [Phase 1](docs/proof/phase-1-proof.md) · [Phase 2](docs/proof/phase-2-proof.md) · [Phase 3](docs/proof/phase-3-proof.md) · [Phase 4](docs/proof/phase-4-proof.md)
- [CHANGELOG.md](CHANGELOG.md) · [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE)
