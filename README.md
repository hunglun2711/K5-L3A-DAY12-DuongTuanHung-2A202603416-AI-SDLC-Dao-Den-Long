# Đảo Đèn Lồng (Phase 1 — Đêm 1: Đảo Bến)

Game 3D góc nhìn thứ ba chạy trên trình duyệt (Three.js) kèm engine mô phỏng thuần Python 60Hz và chế độ headless tuân theo **Test Contract v1.0**. Chạy được trên **Windows, macOS và Linux** mà không cần cài đặt thêm thư viện đồ họa hay internet.

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
- `F` / `Enter`: Nạp đom đóm vào Đèn Lồng Lớn gần nhất
- `Shift` / `K`: Tỏa sáng (Pulse) xua và làm choáng Bóng Mực (tốn `1` đom đóm)
- `Kéo chuột` hoặc `Q` / `E`: Xoay camera 3D
- `R`: Chơi lại sau khi thắng / thua

## Cách tính điểm
Các thông số khớp chính xác `game.contract.json`:
- Nhặt 1 đom đóm: `+10` điểm
- Làm choáng 1 Bóng Mực bằng Tỏa sáng: `+25` điểm
- Thắp sáng 1 Đèn Lồng Lớn (`3` đom đóm): `+100` điểm
- Thưởng khi thắng (thắp đủ 5 đèn): `+2` điểm/giây còn lại + `+50` điểm/ngọn lửa còn lại

## Chạy kiểm thử & chế độ Headless (Test Contract v1.0)
```bash
python3 -m pytest -v
python3 -m src.headless --seed 42 --night 1 --ticks 600 --out out.jsonl
```

## Sáng tạo của tôi
- **Biển mây trôi & Vòng an toàn ánh sáng**: Đảo Bến được bao quanh bởi lớp mây 3D chuyển động chậm; mỗi khi một Đèn Lồng Lớn được thắp, đảo sáng dần lên và hiện vòng tròn vàng biểu thị `safe_radius` (`5.0` m) nơi Bóng Mực không thể xâm nhập.
- **Âm thanh tổng hợp (Web Audio API)**: Tự tổng hợp tiếng nhặt đom đóm, thắp đèn, tỏa sáng và va chạm ngay trên trình duyệt, không phụ thuộc file âm thanh ngoài.
- Toàn bộ hiệu ứng thị giác/âm thanh này nằm hoàn toàn ở `web/game.js`, **không** ảnh hưởng tới logic và đầu ra headless của `src/sim.py`.

## Bằng chứng & Tài liệu
- Ghi chép & giả định Phase 1: [docs/notes/phase-1.md](docs/notes/phase-1.md)
- Bằng chứng kiểm chứng Phase 1: [docs/proof/phase-1-proof.md](docs/proof/phase-1-proof.md)
- Bản quyền & nguồn: [LICENSE](LICENSE), [CREDITS.md](CREDITS.md)
