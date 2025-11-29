# ML Service (Python) cho đồ án

Thư mục này chứa service Python độc lập để:
- Huấn luyện các mô hình ML (dự đoán GPA/điểm, risk, gợi ý môn, ...).
- Expose API (FastAPI) để backend Node gọi khi cần.

Hiện tại mới có demo tối thiểu để bạn chạy thử.

## 1. Cài đặt môi trường

```bash
cd ml
pip install -r requirements.txt
```

Khuyến nghị tạo virtualenv riêng (venv/conda) nhưng không bắt buộc.

## 2. Train thử mô hình GPA demo

Script này dùng dữ liệu **giả lập** để bạn thử pipeline train → lưu model:

```bash
cd ml
python scripts/train_gpa_model.py
```

Sau khi chạy xong sẽ tạo file:

- `ml/models/gpa_reg.pkl`

## 3. Chạy service FastAPI

```bash
cd ml
uvicorn app:app --reload --port 8000
```

Các endpoint chính:

- `GET /health` → kiểm tra service sống.
- `POST /chat` → endpoint demo chatbot:
  - Nhận: `{ "user_id": "...", "message": "..." }`
  - Trả: `{ "reply": "..." }`

Hiện tại logic còn đơn giản (rule-based + message demo). Sau này có thể:

- Gọi API từ backend Node để lấy deadline, điểm, môn học.
- Dùng model `gpa_reg.pkl` (và các model khác) để trả lời thông minh hơn.

## 4. Chưa đụng tới frontend/backend Node

Thư mục này **hoàn toàn độc lập**.  
Bạn có thể:

- Test riêng ML + API bằng Postman/curl.
- Sau khi ổn, mới tạo route ở backend Node để gọi sang `http://localhost:8000/chat`.


