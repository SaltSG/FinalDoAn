# Hướng dẫn Deploy lên Vercel

## Bước 1: Chuẩn bị

### 1.1. Đảm bảo code đã được push lên GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin master
```

### 1.2. Chuẩn bị biến môi trường
Frontend cần biến môi trường `VITE_API_BASE` để kết nối với backend.

**Lưu ý:** Backend và ML service cần được deploy riêng (Railway, Render, hoặc VPS). Sau khi có URL backend, bạn sẽ cấu hình `VITE_API_BASE` trên Vercel.

## Bước 2: Deploy Frontend lên Vercel

### Cách 1: Deploy qua Vercel Dashboard (Khuyến nghị)

1. **Đăng nhập Vercel:**
   - Truy cập https://vercel.com
   - Đăng nhập bằng GitHub account

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Chọn repository `FinalDoAn` từ GitHub
   - Vercel sẽ tự động detect là Vite project

3. **Cấu hình Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (hoặc để trống nếu dùng `vercel.json`)
   - **Build Command:** `npm run build` (hoặc để Vercel tự detect)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Cấu hình Environment Variables:**
   - Vào tab "Environment Variables"
   - Thêm biến:
     ```
     VITE_API_BASE=https://your-backend-url.com
     ```
   - Thay `https://your-backend-url.com` bằng URL backend thực tế của bạn

5. **Deploy:**
   - Click "Deploy"
   - Chờ build và deploy hoàn tất

### Cách 2: Deploy qua Vercel CLI

1. **Cài đặt Vercel CLI:**
```bash
npm install -g vercel
```

2. **Đăng nhập:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd frontend
vercel
```

4. **Cấu hình Environment Variables:**
```bash
vercel env add VITE_API_BASE
# Nhập giá trị: https://your-backend-url.com
```

5. **Deploy production:**
```bash
vercel --prod
```

## Bước 3: Cấu hình Custom Domain (Tùy chọn)

1. Vào Project Settings → Domains
2. Thêm domain của bạn
3. Cấu hình DNS theo hướng dẫn của Vercel

## Bước 4: Deploy Backend và ML Service

### Backend (Node.js/Express)

**Tùy chọn 1: Railway (Khuyến nghị)**
1. Truy cập https://railway.app
2. New Project → Deploy from GitHub repo
3. Chọn backend folder
4. Cấu hình:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: MongoDB URI, JWT_SECRET, etc.

**Tùy chọn 2: Render**
1. Truy cập https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Cấu hình tương tự Railway

### ML Service (Python/FastAPI)

**Tùy chọn 1: Railway**
1. New Service → Python
2. Chọn folder `ml`
3. Cấu hình:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - Environment Variables: API keys cho LLM (OpenAI/Gemini)

**Tùy chọn 2: Render**
1. New → Web Service
2. Chọn Python
3. Cấu hình tương tự

## Bước 5: Cập nhật Environment Variables

Sau khi có URL backend và ML service:

1. Vào Vercel Dashboard → Project → Settings → Environment Variables
2. Cập nhật:
   ```
   VITE_API_BASE=https://your-backend-url.railway.app
   ```
3. Redeploy để áp dụng thay đổi

## Lưu ý quan trọng

1. **CORS:** Đảm bảo backend cho phép CORS từ domain Vercel
2. **WebSocket:** Nếu dùng Socket.IO, cần cấu hình đúng URL
3. **File Uploads:** Backend cần có storage (S3, Cloudinary) hoặc persistent volume
4. **Database:** MongoDB Atlas (cloud) hoặc database trên Railway/Render
5. **Environment Variables:** Không commit file `.env` vào Git

## Troubleshooting

### Build failed
- Kiểm tra Node version (cần >= 18)
- Xem build logs trên Vercel dashboard

### API không kết nối được
- Kiểm tra `VITE_API_BASE` đã đúng chưa
- Kiểm tra CORS trên backend
- Kiểm tra backend đã deploy và chạy chưa

### 404 khi refresh trang
- Đảm bảo `vercel.json` có rewrite rules
- Hoặc cấu hình trong Vercel Dashboard → Settings → Redirects

## Tài liệu tham khảo

- Vercel Docs: https://vercel.com/docs
- Vite Deployment: https://vitejs.dev/guide/static-deploy.html
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

