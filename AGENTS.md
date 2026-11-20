# AGENTS.md — Đảo Đèn Lồng (AI SDLC Lab)

## Lệnh chính
- Kiểm tra cú pháp: `python -m py_compile src/sim.py src/headless.py src/server.py`
- Chạy unit & contract tests: `python -m pytest -v`
- Chạy headless (Đêm 1/2/3): `python -m src.headless --seed 1 --night 1 --ticks 600 --out /tmp/out.jsonl`
- Chạy game 3D (Web + Python server): `python src/server.py`

## Quy tắc bắt buộc
1. **Test Contract v1.2 là chân lý**: Không thay đổi schema `game.contract.json`, CLI flags (`--night 1|2|3`), exit code (`2` cho lỗi format inputs/scenario), hay thứ tự 12 bước trong 1 tick.
2. **Độ chính xác nhiên liệu**: Tính `fuel` bằng số nguyên đơn vị `1/60` (`fuel_units`, `6000 = 100.0`) trong `src/sim.py` để tránh sai số số thực; chỉ làm tròn 1 chữ số thập phân khi xuất snapshot/event.
3. **Tách logic khỏi hiển thị**: Mọi luật chơi nằm trong `src/sim.py` (pure Python, không phụ thuộc GUI/GPU).
4. **Tính tất định & hiệu năng**: Cùng `--seed`, `--night`, `--scenario`, `--inputs` phải ra output JSONL giống hệt nhau từng byte; chạy 18.000 tick headless phải xong trong `<= 30s`.
5. **Trung thực kiểm chứng**: Không sửa tay output, không viết test luôn đạt. Test cũ bị luật mới thay thế phải sửa/xóa kèm lý do rõ ràng.
