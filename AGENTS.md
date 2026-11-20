# AGENTS.md — Đảo Đèn Lồng (AI SDLC Lab)

## Lệnh chính
- Kiểm tra cú pháp: `python -m py_compile src/sim.py src/headless.py src/server.py`
- Chạy unit & contract tests: `python -m pytest -v`
- Chạy headless (Đêm 1/2/3): `python -m src.headless --seed 1 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Chạy game 3D (Web + Python server): `python src/server.py`

## Quy tắc bắt buộc
1. **Test Contract v1.1 là chân lý**: Không thay đổi schema `game.contract.json`, CLI flags (`--night 1|2|3`), exit code (`2` cho lỗi format inputs/scenario), hay thứ tự 12 bước trong 1 tick.
2. **Tách logic khỏi hiển thị**: Mọi luật chơi nằm trong `src/sim.py` (pure Python, không phụ thuộc GUI/GPU).
3. **Tính tất định & hiệu năng**: Cùng `--seed`, `--night`, `--scenario`, `--inputs` phải ra output JSONL giống hệt nhau từng byte; chạy 21.600 tick headless phải xong trong `<= 30s`.
4. **Sáng tạo không phá lõi**: Thực thể/hiệu ứng phụ chỉ chạy ở phần hiển thị (`web/`) hoặc tắt khi chạy headless.
5. **Trung thực kiểm chứng**: Không sửa tay output, không viết test luôn đạt. Nếu chưa đạt, ghi rõ lý do.
