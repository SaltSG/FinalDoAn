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
├─ frontend/              # Ứng dụng React cho sinh viên
│  └─ src/
│     ├─ pages/           # Các trang: Dashboard, Progress, Results, Calendar, Chatbot, Summary, ...
│     ├─ components/      # Navbar, Sidebar, ChatbotWidget, ChatWidget, NotificationBell, ...
│     ├─ hooks/
│     ├─ services/        # Gọi API: auth, results, curriculum, deadlines, events realtime, ...
│     ├─ lib/             # Hàm tiện ích (ví dụ: grading)
│     └─ types/
├─ admin/                 # Ứng dụng React cho trang quản trị
│  └─ src/
│     ├─ App.tsx
│     ├─ main.tsx
│     └─ services/        # Gọi API cho phần admin
├─ backend/               # API Express + Socket.io
│  └─ src/
│     ├─ config/          # Kết nối DB, Redis
│     ├─ controllers/     # Xử lý nghiệp vụ: auth, results, curriculum, deadlines, chat, chatbot context, ...
│     ├─ models/          # Mongoose models: User, UserResults, Curriculum, Deadline, ChatMessage, ...
│     ├─ routes/          # Định nghĩa routing: /auth, /results, /curriculum, /deadlines, /chat, /chatbot, ...
│     ├─ realtime/        # Khởi tạo Socket.io server
│     ├─ middleware/      # auth middleware, ...
│     ├─ utils/           # Tiện ích (upload, ...)
│     └─ index.ts         # Điểm vào của backend
├─ ml/                    # ML / Chatbot service (Python + FastAPI)
│  ├─ app.py              # FastAPI app, expose /chat
│  ├─ services/           # logic chatbot, intent, data_client, llm_client, ...
│  ├─ scripts/            # Train model demo (intent, GPA)
│  └─ models/             # Model đã train (.pkl)
├─ backend/uploads/       # File upload (ảnh, tài liệu) lưu tạm thời
├─ .editorconfig
├─ .gitignore
├─ .prettierrc.json
├─ package.json           # Workspaces + scripts
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

### Cộng tác qua Git
1. Khởi tạo repo, đẩy lên GitHub, mời collaborator
2. Tạo nhánh từ `main`, mở Pull Request để review

### Bản quyền
MIT License — xem file LICENSE


