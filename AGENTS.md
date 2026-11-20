# AGENTS.md — Đảo Đèn Lồng (AI SDLC Lab)

## Lệnh chính
- Kiểm tra cú pháp: `python -m py_compile src/sim.py src/headless.py src/server.py`
- Chạy unit & contract tests: `pytest -q`
- Chạy headless: `python -m src.headless --seed 1 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Chạy game 3D (Web + Python server): `python src/server.py`

## Quy tắc bắt buộc
1. **Test Contract v1.0 là chân lý**: Không thay đổi schema `game.contract.json`, CLI flags, exit code (`2` cho lỗi format inputs/scenario), hay định dạng JSONL output.
2. **Tách logic khỏi hiển thị**: Mọi luật chơi nằm trong `src/sim.py` (pure Python, không phụ thuộc GUI/GPU).
3. **Tính tất định**: Cùng `--seed`, `--scenario`, `--inputs` phải ra output JSONL giống hệt nhau từng byte.
4. **Sáng tạo không phá lõi**: Thực thể/hiệu ứng phụ chỉ chạy ở phần hiển thị (`web/`) hoặc tắt khi chạy headless.
5. **Trung thực kiểm chứng**: Không sửa tay output, không viết test luôn đạt. Nếu chưa đạt, ghi rõ lý do.
