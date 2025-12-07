# 🚀 Hướng dẫn Deploy nhanh lên Vercel

## Bước 1: Đăng nhập Vercel
1. Vào https://vercel.com
2. Đăng nhập bằng GitHub

## Bước 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Chọn repository **FinalDoAn** từ GitHub
3. Vercel sẽ tự động detect Vite

## Bước 3: Cấu hình
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (hoặc để tự động)
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## Bước 4: Thêm Environment Variable
Vào **Settings** → **Environment Variables**, thêm:
```
VITE_API_BASE=https://your-backend-url.com
```
*(Thay bằng URL backend thực tế sau khi deploy backend)*

## Bước 5: Deploy
Click **"Deploy"** và chờ hoàn tất!

---

## ⚠️ Lưu ý

1. **Backend cần deploy riêng** (Railway/Render/VPS)
2. **ML service cần deploy riêng** (Railway/Render)
3. Sau khi có URL backend, cập nhật `VITE_API_BASE` và redeploy

## 📚 Xem chi tiết
Xem file `DEPLOY_VERCEL.md` để biết cách deploy backend và ML service.

