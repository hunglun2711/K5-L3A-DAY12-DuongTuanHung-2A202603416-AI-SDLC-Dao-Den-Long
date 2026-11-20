---
name: verify-phase
description: Chạy toàn bộ unit tests, contract tests (v1.3), kiểm tra tính tất định và hiệu năng cả 3 Đêm, lưu bằng chứng vào docs/proof/.
---

# Quy trình kiểm chứng phase

1. Chạy `python -m py_compile src/sim.py src/headless.py src/server.py src/bench.py src/soak.py src/leaderboard.py`.
2. Chạy `python -m pytest -v` và ghi nhận số test pass/fail.
3. Chạy headless CLI với `--night 1`, `--night 2`, `--night 3` (2 lần mỗi đêm với seed cố định) và so sánh SHA256 để chứng minh tính tất định.
4. Đo thời gian chạy full Đêm 3 (21.600 tick) để chắc chắn `<= 30s`.
5. Lưu kết quả thật (không chỉnh sửa tay) vào `docs/proof/phase-N-proof.md`.
