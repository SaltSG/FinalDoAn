# Khả năng của Chatbot Hỗ trợ Học tập

Chatbot được tích hợp với backend Node và CSDL của đồ án, nên có thể trả lời **theo dữ liệu thật của từng sinh viên** (dựa trên tài khoản đang đăng nhập).

---

## 📊 1. Điểm & GPA

### 1.1. GPA / Điểm trung bình tích lũy

**Dữ liệu dùng:** `stats.cumGpa4` từ `/api/chatbot/context` (GPA hệ 4 theo từng học kỳ), nội suy sang hệ 10 nếu cần.

**Hàm xử lý chính:** `_answer_gpa` (khi không có môn cụ thể trong câu hỏi).

**Ví dụ câu hỏi:**
- "GPA của tôi là bao nhiêu?"
- "Điểm trung bình tích lũy của t giờ là bao nhiêu?"
- "Điểm GPA hiện tại của mình?"
- "GPA tích lũy của t?"
- "Điểm trung bình của tôi?"

---

### 1.2. Điểm theo môn học

**Dữ liệu dùng:** `results` (bảng điểm theo học kỳ, theo mã môn) trong `/api/chatbot/context` + thông tin môn từ `curriculum` (tên, tín chỉ, cờ `countInGpa` / `countInCredits`).

**Hàm xử lý chính:** `_answer_gpa` + `find_course_in_text` (khi nhận diện được môn trong câu hỏi) và `_answer_course` (fallback khi intent là course).

**Khả năng:**
- Lấy điểm hiện có của một môn (thang 10).
- Nhận diện môn theo: mã (MULxxxx), tên đầy đủ, tên bỏ số cuối, alias đơn giản (vd: "csdl" → "Cơ sở dữ liệu").
- Phân biệt trạng thái: Đậu / Trượt / Chưa có điểm.

**Ví dụ câu hỏi:**
- "Điểm môn Toán cao cấp 1 của tôi?"
- "Điểm môn MUL13150 là bao nhiêu?"
- "Thiết kế đồ họa được mấy điểm?"
- "Điểm môn Cơ sở dữ liệu?"
- "Môn lập trình web t được bao nhiêu điểm?"
- "Điểm INT1306 của t?"
- (Sau khi đã hỏi một môn) chỉ gõ tên môn khác, ví dụ: "thiết kế đa phương tiện" → bot hiểu đang hỏi điểm môn đó.

---

## 📚 2. Tín chỉ & Môn nợ

### 2.1. Tín chỉ đã tích lũy và còn thiếu

**Dữ liệu dùng:** `results` + `curriculum` (cờ `countInCredits`, `credit`).  
**Logic:** `_calculate_gpa_and_credits` + `_answer_credits`.

**Khả năng:**
- Tính tổng tín chỉ **đã tích lũy** (chỉ các môn `countInCredits !== false` và **Đạt**).
- Tính tổng tín chỉ **yêu cầu tốt nghiệp** của chuyên ngành.
- Tính số tín chỉ **còn thiếu**.

**Ví dụ câu hỏi:**
- "Tôi đã tích lũy được bao nhiêu tín chỉ rồi?"
- "Còn thiếu bao nhiêu tín nữa thì đủ tốt nghiệp?"
- "Tích lũy được bao nhiêu tín rồi?"
- "Tổng số tín chỉ đã học của t?"
- "Còn bao nhiêu tín chỉ nữa?"

---

### 2.2. Môn nợ (học lại)

**Dữ liệu dùng:** như trên, nhưng dựa trên `status` của từng môn (`passed` / `failed`).  
**Chỉ những môn `status == 'failed'` mới được tính là môn nợ.**

**Hàm xử lý:** `_answer_credits` (phần nợ môn) + `_answer_graduation` (khi đánh giá tốt nghiệp).

**Ví dụ câu hỏi:**
- "Tôi đang nợ những môn nào?"
- "Còn bao nhiêu môn F phải học lại?"
- "Nợ môn gì, tổng cộng bao nhiêu tín?"
- "Môn nào tôi bị trượt?"
- "Danh sách môn nợ của t?"

---

### 2.3. Môn không tính vào GPA

**Dữ liệu dùng:** `curriculum.semesters[].courses[]` với `countInGpa === false`.  
**Hàm xử lý:** `_answer_non_gpa_courses`.

**Ví dụ câu hỏi:**
- "Các môn nào không tính vào GPA?"
- "Môn nào không được tính vào điểm trung bình?"
- "Những môn học không tính GPA của tôi?"
- "Môn nào không ảnh hưởng đến GPA?"

---

## 📅 3. Deadline & Lịch học

### 3.1. Tóm tắt deadline toàn bộ

**Dữ liệu dùng:** `deadlines` từ `/api/chatbot/context` hoặc `/api/deadlines`.  
**Hàm xử lý:** `_answer_deadline` (khi không có môn cụ thể).

**Khả năng:**
- Đếm số deadline đang còn hạn (`upcoming` + `ongoing`) và số deadline quá hạn (`overdue`).
- Trả lời nhanh tình hình deadline hiện tại.

**Ví dụ câu hỏi:**
- "Deadline tuần này của tôi thế nào?"
- "Tóm tắt các deadline còn lại đi."
- "Deadline của t còn nhiều không?"
- "Có bao nhiêu deadline sắp tới?"
- "Deadline nào đang sắp hết hạn?"

---

### 3.2. Deadline theo môn học

**Dữ liệu dùng:** `deadlines` + `courseCode` và/hoặc từ khóa tên môn trong title/note.  
**Hàm xử lý:** `_answer_deadline` + `find_course_in_text`.

**Khả năng:**
- Liệt kê số lượng deadline của một môn.
- Phân loại: còn hạn / quá hạn / đã hoàn thành.
- Tìm deadline gần nhất còn hạn của môn đó (upcoming/ongoing gần nhất).

**Ví dụ câu hỏi:**
- "Deadline môn Cơ sở dữ liệu tuần này?"
- "Deadline tiếp theo của MUL1320 là khi nào?"
- "Môn lập trình web còn deadline nào không?"
- "Deadline môn thiết kế đồ họa?"
- "Khi nào deadline môn Toán cao cấp 1?"

---

## 🎓 4. Khả năng tốt nghiệp & Cảnh báo học tập

### 4.1. Khả năng tốt nghiệp đúng hạn (ước lượng)

**Dữ liệu dùng:** kết quả `_calculate_gpa_and_credits` (GPA hệ 10, tín chỉ đã tích lũy, môn nợ), tổng tín chỉ yêu cầu; giả định 8 học kỳ chính.  
**Hàm xử lý:** `_answer_graduation`.

**Khả năng:**
- Đánh giá mức **CAO / TRUNG BÌNH / THẤP** cho khả năng tốt nghiệp đúng hạn, dựa trên:
  - GPA hiện tại so với ngưỡng tối thiểu (giả định 5.0 hệ 10),
  - Số tín chỉ đã tích lũy / còn thiếu,
  - Số môn nợ,
  - Ước lượng học kỳ hiện tại.

**Ví dụ câu hỏi:**
- "Khả năng tốt nghiệp đúng hạn của tôi thế nào?"
- "Liệu tôi có kịp ra trường đúng hạn không?"
- "Đánh giá khả năng ra trường đúng hạn giúp t với."
- "Tôi có thể tốt nghiệp đúng hạn không?"
- "Khả năng tốt nghiệp của t?"

---

### 4.2. Cảnh báo học tập

**Dữ liệu dùng:** `stats.semGpa4`, `stats.cumGpa4` từ `/api/chatbot/context`.  
**Hàm xử lý:** `_answer_academic_warning`.

**Logic (theo quy định bạn cung cấp):**
- Cảnh báo mức 1 khi:
  - ĐTB chung học kỳ chính < 1.0, hoặc
  - ĐTB chung tích lũy < các ngưỡng: 1.20 (năm 1), 1.40 (năm 2), 1.60 (năm 3), 1.80 (năm 4+).

**Ví dụ câu hỏi:**
- "Tôi có bị cảnh báo học tập không?"
- "Nguy cơ cảnh báo học tập của t hiện giờ?"
- "Mức cảnh báo học tập của tôi là gì?"
- "T có bị cảnh báo không?"
- "Tình trạng cảnh báo học tập của t?"

---

## 💡 5. Phân tích điểm mạnh / điểm yếu

**Dữ liệu dùng:** `results` + `curriculum` (để lấy điểm và thông tin môn học).  
**Hàm xử lý:** `_answer_strengths_weaknesses`.

**Khả năng:**
- Phân tích các môn học tốt nhất (điểm cao nhất).
- Phân tích các môn học kém nhất (điểm thấp nhất hoặc trượt).
- Đưa ra nhận xét và gợi ý cải thiện.

**Ví dụ câu hỏi:**
- "Điểm mạnh điểm yếu môn học của t?"
- "Môn nào tôi học tốt nhất?"
- "Môn nào tôi học kém nhất?"
- "Phân tích học lực của t?"
- "Môn nào t mạnh, môn nào t yếu?"
- "Phân tích điểm mạnh điểm yếu giúp t"

---

## 💬 6. Hỗ trợ hội thoại & ghi nhớ ngữ cảnh đơn giản

### 6.1. Nhớ intent gần nhất (ngữ cảnh)

**Dữ liệu dùng:** state trong RAM (`_SESSION_STATE`), key theo `user_id`.  
**Hàm xử lý:** `handle_chat` dùng `_get_session_state`.

**Khả năng:**
- Nhớ intent cuối cùng (`last_intent`), ví dụ: `gpa`, `credits`, `graduation`, `deadline`, `warning`, `course`, `non_gpa_courses`, `strengths_weaknesses`.
- Với các câu kiểu "còn gì nữa không?", "tiếp tục đi", nếu mô hình intent không nhận được intent mới, sẽ **fallback** dùng lại `last_intent`.

**Ví dụ:**
- User: "Khả năng tốt nghiệp của t?" → bot phân tích & trả lời.
- User: "còn gì nữa không?" → bot tiếp tục nói thêm về chủ đề **tốt nghiệp**, không nhảy sang topic khác.

---

### 6.2. Chào hỏi, giới thiệu

**Hàm xử lý:** `handle_chat` (phần xử lý greetings).

**Khả năng:**
- Nếu câu có "chào", "hello", "hi" → bot chào lại, gọi tên sinh viên (lấy từ context) nếu có.

**Ví dụ câu hỏi:**
- "Chào bot"
- "Hello"
- "Hi bạn"
- "Xin chào"
- "Chào"

---

### 6.3. Hỏi bot là ai / làm được gì

**Hàm xử lý:** `handle_chat` (phần xử lý general_questions).

**Ví dụ câu hỏi:**
- "Bạn là ai?"
- "Bạn giúp được gì?"
- "Giúp tôi với"
- "Bot làm được gì?"

---

### 6.4. Tiếp tục hội thoại

**Ví dụ câu hỏi:**
- "Còn gì nữa không?"
- "Tiếp tục đi"
- "Nữa không?"
- "Còn gì nữa?"

**Lưu ý:** Bot sẽ nhớ chủ đề vừa nói và tiếp tục trả lời về chủ đề đó.

---

## 📝 7. Các câu hỏi khác

### 7.1. Hình thức thi

**Dữ liệu dùng:** `curriculum.semesters[].courses[].examFormat`.  
**Hàm xử lý:** `_answer_course` (khi hỏi về hình thức thi).

**Ví dụ câu hỏi:**
- "Hình thức thi môn Toán cao cấp 1 là gì?"
- "Môn Cơ sở dữ liệu thi như thế nào?"
- "Thi môn MUL13150 như thế nào?"

---

### 7.2. Thông tin môn học

**Dữ liệu dùng:** `curriculum` (tên, tín chỉ, mã môn).  
**Hàm xử lý:** `_answer_course`.

**Ví dụ câu hỏi:**
- "Môn Cơ sở dữ liệu có bao nhiêu tín chỉ?"
- "Thông tin môn Toán cao cấp 1?"
- "MUL13150 là môn gì?"

---

## 💡 Lưu ý khi sử dụng

1. **Bot hiểu tiếng Việt không dấu:** Bạn có thể gõ "diem cua toi", "GPA cua t", "tin chi"...

2. **Bot nhớ ngữ cảnh:** Sau khi hỏi một môn, bạn chỉ cần gõ tên môn khác, bot sẽ hiểu bạn đang hỏi điểm môn đó.

3. **Bot trả lời dựa trên dữ liệu thật:** Tất cả thông tin (GPA, điểm, tín chỉ, deadline...) đều lấy từ dữ liệu thật của bạn trong hệ thống.

4. **Có thể hỏi tự nhiên:** Bạn không cần dùng câu hỏi chính xác, bot sẽ hiểu ý bạn.

---

## 🚀 Mở rộng trong tương lai

Các tính năng có thể thêm tiếp (cần code bổ sung trong `logic.py` + `data_client.py`):

- Gợi ý **học bổng** (đánh giá đạt/không theo điều kiện GPA, tín chỉ).
- Gợi ý **môn nên đăng ký kỳ tới** để tối ưu GPA hoặc đủ tín chỉ.
- Hỏi về **lịch thi** nếu có API/collection riêng.
- Phân tích **xu hướng GPA** (tăng/giảm theo kỳ).

Mỗi tính năng mới nên được mô tả trong file này với:

- Tên intent / hàm `_answer_...`,
- Dữ liệu backend sử dụng,
- Ví dụ câu hỏi mẫu.
