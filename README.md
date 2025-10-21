## Hệ thống quản lý tiến độ học tập cá nhân (React + Node.js)

Monorepo cho đồ án tốt nghiệp: Xây dựng hệ thống quản lý tiến độ học tập cá nhân cho sinh viên ngành Công nghệ đa phương tiện.

### Kiến trúc
- client: React + Vite + TypeScript
- server: Node.js + Express + TypeScript
- Quản lý bằng npm workspaces, lint/format đồng bộ, CI GitHub Actions

### Yêu cầu hệ thống
- Node.js >= 18
- npm >= 9

### Chạy nhanh (dev)
```bash
npm install
npm run dev
```
- Client: http://localhost:5173
- Server: http://localhost:5000

### Scripts chính
- `npm run dev`: chạy đồng thời client và server
- `npm run build`: build cả 2 workspace
- `npm run lint`: ESLint toàn repo
- `npm run format`: Prettier toàn repo
- `npm run typecheck`: kiểm tra kiểu TypeScript

### Cấu trúc thư mục
```
.
├─ client/        # Ứng dụng React
├─ server/        # API Express
├─ .github/       # CI workflow
├─ .editorconfig
├─ .gitignore
├─ .prettierrc.json
├─ package.json   # Workspaces + scripts
└─ README.md
```

### Quy ước commit (khuyến nghị)
- feat: tính năng mới
- fix: sửa lỗi
- docs: cập nhật tài liệu
- style: format/code style
- refactor: tái cấu trúc
- test: bổ sung test
- chore: việc vặt (build, deps, CI)

### Biến môi trường
- `server/.env` (tham khảo `server/.env.example`)
- `client/.env` (không bắt buộc do đã cấu hình proxy)

### Cộng tác qua Git
1. Khởi tạo repo, đẩy lên GitHub, mời collaborator
2. Tạo nhánh từ `main`, mở Pull Request để review

### Bản quyền
MIT License — xem file LICENSE


