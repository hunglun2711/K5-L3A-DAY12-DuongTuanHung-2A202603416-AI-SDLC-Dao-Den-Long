---
name: verify-phase
description: Chạy toàn bộ unit tests, contract tests, kiểm tra tính tất định và lưu bằng chứng vào docs/proof/.
---

# Quy trình kiểm chứng phase

1. Chạy `python -m py_compile src/sim.py src/headless.py src/server.py`.
2. Chạy `pytest -v` và ghi nhận số test pass/fail.
3. Chạy headless CLI với seed cố định 2 lần liên tiếp và so sánh hash/nội dung để chứng minh tính tất định.
4. Lưu kết quả thật (không chỉnh sửa tay) vào `docs/proof/phase-N-proof.md`.
