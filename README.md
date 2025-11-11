## Hệ thống quản lý tiến độ học tập cá nhân (React + Node.js)

Monorepo cho đồ án tốt nghiệp: Xây dựng hệ thống quản lý tiến độ học tập cá nhân cho sinh viên ngành Công nghệ đa phương tiện.

### Kiến trúc
- frontend: React + Vite + TypeScript
- backend: Node.js + Express + TypeScript
- Quản lý bằng npm workspaces, lint/format đồng bộ, CI GitHub Actions

### Yêu cầu hệ thống
- Node.js >= 18
- npm >= 9

### Chạy nhanh (dev)
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Scripts chính
- `npm run dev`: chạy đồng thời client và server
- `npm run build`: build cả 2 workspace
- `npm run lint`: ESLint toàn repo
- `npm run format`: Prettier toàn repo
- `npm run typecheck`: kiểm tra kiểu TypeScript

### Cấu trúc thư mục
```
.
├─ frontend/      # Ứng dụng React
│  └─ src/
│     ├─ pages/
│     ├─ components/
│     ├─ hooks/
│     └─ services/
├─ backend/       # API Express
│  └─ src/
│     ├─ routes/
│     ├─ models/
│     └─ controllers/
├─ .github/       # CI workflow
├─ .editorconfig
├─ .gitignore
├─ .prettierrc.json
├─ package.json   # Workspaces + scripts
└─ README.md
```

### Màu thương hiệu
- Primary (cam): `#f59e0b`
- Secondary (xanh navy): `#1f3b5b`
- Accent: `#5ec6df`
- Đã khai báo trong `frontend/src/styles.css` dưới dạng CSS variables (`--color-primary`, `--color-secondary`, `--color-accent`).

### Quy ước commit (khuyến nghị)
- feat: tính năng mới
- fix: sửa lỗi
- docs: cập nhật tài liệu
- style: format/code style
- refactor: tái cấu trúc
- test: bổ sung test
- chore: việc vặt (build, deps, CI)

### Biến môi trường
- `backend/.env` (tham khảo `backend/.env.example`)
- `frontend/.env` (không bắt buộc do đã cấu hình proxy)

### Thiết lập Admin
Để set một user thành admin, xem file [ADMIN_SETUP.md](./ADMIN_SETUP.md)

Cách nhanh nhất:
```bash
cd backend
npm run set-admin <email>
```

Sau đó đăng xuất và đăng nhập lại để thấy menu "Quản trị".

### Cộng tác qua Git
1. Khởi tạo repo, đẩy lên GitHub, mời collaborator
2. Tạo nhánh từ `main`, mở Pull Request để review

### Bản quyền
MIT License — xem file LICENSE


