# Hướng dẫn thiết lập Admin

Có 3 cách để set một user thành admin:

## Cách 1: Sử dụng Script (Khuyên dùng)

1. Đảm bảo bạn đã có user trong hệ thống (đăng ký/đăng nhập trước)

2. Chạy script:
```bash
cd backend
npm run set-admin <email>
```

Ví dụ:
```bash
npm run set-admin user@example.com
```

Hoặc nếu bạn muốn chạy trực tiếp:
```bash
cd backend
npx tsx scripts/set-admin.ts user@example.com
```

3. Đăng nhập lại với email đó, bạn sẽ thấy menu "Quản trị" trong sidebar

## Cách 2: Sử dụng API Endpoint

1. Đảm bảo bạn đã có user trong hệ thống

2. Set biến môi trường `ADMIN_SETUP_SECRET` (optional, mặc định là `change-me-in-production`):
```bash
# Trong file .env
ADMIN_SETUP_SECRET=your-secret-key-here
```

3. Gọi API:
```bash
curl -X POST http://localhost:5000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "secretKey": "your-secret-key-here"
  }'
```

Hoặc sử dụng Postman/Thunder Client:
- URL: `POST http://localhost:5000/api/auth/setup-admin`
- Body (JSON):
```json
{
  "email": "user@example.com",
  "secretKey": "your-secret-key-here"
}
```

**Lưu ý**: Endpoint này chỉ hoạt động khi chưa có admin nào trong hệ thống. Nếu đã có admin, bạn cần sử dụng admin panel để set admin mới.

## Cách 3: Set trực tiếp trong MongoDB

1. Kết nối MongoDB:
```bash
mongosh
# hoặc
mongo
```

2. Chọn database:
```javascript
use finaldoan
```

3. Tìm user và set role:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

4. Kiểm tra:
```javascript
db.users.findOne({ email: "user@example.com" })
```

## Sau khi set admin

1. **Đăng xuất và đăng nhập lại** để JWT token được cập nhật với role mới

2. Bạn sẽ thấy menu **"Quản trị"** trong sidebar với các trang:
   - Bảng điều khiển (`/admin`)
   - Người dùng (`/admin/users`)
   - Chương trình học (`/admin/curriculum`)

## Tạo Admin từ user đã có

Nếu bạn đã có user trong hệ thống:
1. Đăng ký/đăng nhập bình thường
2. Sử dụng một trong 3 cách trên để set role thành `admin`
3. Đăng xuất và đăng nhập lại

## Tạo Admin mới

1. Đăng ký user mới tại `/login`
2. Sử dụng script hoặc API để set thành admin
3. Đăng nhập lại

## Bảo mật

- **Production**: Nhớ đổi `ADMIN_SETUP_SECRET` trong file `.env` thành một giá trị an toàn
- Endpoint `/api/auth/setup-admin` chỉ hoạt động khi chưa có admin nào
- Sau khi có admin đầu tiên, chỉ admin mới có thể set admin khác thông qua admin panel

## Troubleshooting

### Không thấy menu "Quản trị"
- Đảm bảo bạn đã đăng xuất và đăng nhập lại sau khi set admin
- Kiểm tra JWT token có chứa role `admin` không
- Kiểm tra trong MongoDB: `db.users.findOne({ email: "your-email" })`

### Script không chạy
- Đảm bảo đã cài đặt dependencies: `npm install`
- Kiểm tra MongoDB đang chạy
- Kiểm tra MONGO_URI trong `.env` đúng chưa

### API trả về lỗi "Admin already exists"
- Endpoint này chỉ dùng để tạo admin đầu tiên
- Nếu đã có admin, sử dụng admin panel tại `/admin/users` để set admin mới

