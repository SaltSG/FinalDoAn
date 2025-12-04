# PHƯƠNG PHÁP NGHIÊN CỨU

## ĐỀ TÀI: XÂY DỰNG HỆ THỐNG QUẢN LÝ TIẾN ĐỘ HỌC TẬP CÁ NHÂN CHO SINH VIÊN NGÀNH CÔNG NGHỆ ĐA PHƯƠNG TIỆN

---

## 1. TỔNG QUAN VỀ PHƯƠNG PHÁP NGHIÊN CỨU

Dự án được thực hiện theo phương pháp nghiên cứu ứng dụng, kết hợp giữa nghiên cứu lý thuyết và phát triển thực nghiệm. Phương pháp nghiên cứu được chia thành các giai đoạn chính: thu thập và phân tích yêu cầu, thiết kế hệ thống, phát triển và triển khai, kiểm thử và đánh giá.

---

## 2. PHƯƠNG PHÁP THU THẬP VÀ PHÂN TÍCH YÊU CẦU

### 2.1. Phương pháp nghiên cứu tài liệu

- **Nghiên cứu quy định đào tạo**: Phân tích quy định về chương trình đào tạo ngành Công nghệ đa phương tiện tại PTIT, bao gồm:
  - Cấu trúc chương trình đào tạo theo học kỳ
  - Quy định về tính điểm (thang điểm 10 và thang điểm 4)
  - Công thức tính GPA (Grade Point Average)
  - Quy định về tín chỉ và điều kiện tốt nghiệp
  - Quy định về cảnh báo học tập

- **Nghiên cứu hệ thống hiện có**: Tìm hiểu các hệ thống quản lý học tập hiện có trong và ngoài nước để:
  - Xác định các tính năng cần thiết
  - Học hỏi các giải pháp tốt
  - Tránh lặp lại các hạn chế của hệ thống cũ

### 2.2. Phương pháp khảo sát và phỏng vấn

- **Khảo sát nhu cầu sinh viên**: Xác định các vấn đề mà sinh viên đang gặp phải trong việc quản lý học tập:
  - Khó khăn trong việc tính toán GPA thủ công
  - Khó khăn trong việc theo dõi tín chỉ đã tích lũy
  - Khó khăn trong việc quản lý deadline và lịch học
  - Nhu cầu về công cụ tư vấn học tập

- **Phân tích yêu cầu chức năng**: Dựa trên kết quả khảo sát, xác định các yêu cầu chức năng:
  - Quản lý và tính toán tiến độ học tập tự động
  - Quản lý deadline và lịch học tích hợp
  - Chatbot AI hỗ trợ học tập
  - Phân tích và cảnh báo học tập
  - Cá nhân hóa theo chuyên ngành

### 2.3. Phương pháp phân tích hệ thống

- **Phân tích luồng dữ liệu**: Xác định các luồng dữ liệu chính trong hệ thống:
  - Dữ liệu điểm số và kết quả học tập
  - Dữ liệu chương trình đào tạo
  - Dữ liệu deadline và lịch học
  - Dữ liệu tương tác với chatbot

- **Phân tích luồng nghiệp vụ**: Xác định các quy trình nghiệp vụ:
  - Quy trình nhập và cập nhật điểm số
  - Quy trình tính toán GPA và tín chỉ
  - Quy trình tạo và quản lý deadline
  - Quy trình tương tác với chatbot

---

## 3. PHƯƠNG PHÁP THIẾT KẾ HỆ THỐNG

### 3.1. Phương pháp thiết kế kiến trúc

- **Kiến trúc microservices**: Hệ thống được thiết kế với kiến trúc tách biệt thành 3 service chính:
  - **Frontend Service**: Ứng dụng web React + TypeScript, chịu trách nhiệm giao diện người dùng
  - **Backend Service**: API server Node.js + Express + TypeScript, chịu trách nhiệm xử lý logic nghiệp vụ và quản lý dữ liệu
  - **ML Service**: Python service, chịu trách nhiệm xử lý chatbot AI và phân tích dữ liệu

- **Lợi ích của kiến trúc microservices**:
  - Tách biệt rõ ràng giữa các thành phần, dễ bảo trì và mở rộng
  - Cho phép phát triển độc lập từng service
  - Dễ dàng scale từng service theo nhu cầu
  - Có thể thay thế hoặc nâng cấp từng service mà không ảnh hưởng đến các service khác

### 3.2. Phương pháp thiết kế cơ sở dữ liệu

- **Mô hình dữ liệu quan hệ**: Sử dụng MongoDB (NoSQL) để lưu trữ dữ liệu với các collection chính:
  - **User**: Thông tin người dùng (sinh viên, admin)
  - **UserResults**: Kết quả học tập của sinh viên (điểm số, GPA, tín chỉ)
  - **Curriculum**: Chương trình đào tạo theo chuyên ngành và học kỳ
  - **Deadline**: Deadline và sự kiện học tập
  - **CalendarEvent**: Lịch thi và lịch học
  - **ChatMessage**: Tin nhắn trong chat giữa sinh viên
  - **ChatRead**: Trạng thái đã đọc tin nhắn

- **Thiết kế schema**: Mỗi collection được thiết kế với schema rõ ràng, đảm bảo:
  - Tính nhất quán của dữ liệu
  - Hiệu suất truy vấn tốt
  - Dễ dàng mở rộng trong tương lai

### 3.3. Phương pháp thiết kế giao diện người dùng

- **Thiết kế hướng người dùng (User-Centered Design)**:
  - Giao diện trực quan, dễ sử dụng
  - Responsive design, hỗ trợ nhiều kích thước màn hình
  - Sử dụng màu sắc và biểu tượng để phân biệt các loại thông tin
  - Cung cấp feedback ngay lập tức cho các hành động của người dùng

- **Thiết kế component-based**: Sử dụng React component để:
  - Tái sử dụng code
  - Dễ bảo trì và mở rộng
  - Đảm bảo tính nhất quán trong giao diện

### 3.4. Phương pháp thiết kế API
x`
- **RESTful API**: Backend cung cấp REST API với các endpoint:
  - `/api/results`: Quản lý kết quả học tập (GET, PUT)
  - `/api/curriculum`: Quản lý chương trình đào tạo (GET, POST, PUT, DELETE)
  - `/api/deadlines`: Quản lý deadline (GET, POST, PUT, DELETE)
  - `/api/events`: Quản lý lịch học/lịch thi (GET, POST, PUT, DELETE)
  - `/api/chat`: Quản lý tin nhắn chat (GET, POST)
  - `/api/chatbot`: Xử lý câu hỏi chatbot (POST)

- **WebSocket API**: Sử dụng Socket.IO để:
  - Đồng bộ dữ liệu real-time giữa các client
  - Cập nhật tin nhắn chat ngay lập tức
  - Hiển thị trạng thái online/offline của người dùng

---

## 4. PHƯƠNG PHÁP PHÁT TRIỂN HỆ THỐNG

### 4.1. Phương pháp phát triển phần mềm

- **Phương pháp Agile/Iterative**: Phát triển hệ thống theo các sprint ngắn:
  - Mỗi sprint tập trung vào một số tính năng cụ thể
  - Thường xuyên kiểm thử và nhận phản hồi
  - Điều chỉnh và cải thiện liên tục

- **Monorepo structure**: Sử dụng npm workspaces để quản lý toàn bộ dự án trong một repository:
  - Dễ dàng chia sẻ code và dependencies giữa các phần
  - Đồng bộ version và cấu hình
  - Dễ dàng build và deploy

### 4.2. Công nghệ và công cụ phát triển

- **Frontend**:
  - **React 18**: Framework JavaScript cho giao diện người dùng
  - **TypeScript**: Ngôn ngữ lập trình với type safety
  - **Vite**: Build tool hiện đại, hỗ trợ hot reload
  - **Ant Design**: UI component library
  - **FullCalendar**: Thư viện hiển thị lịch

- **Backend**:
  - **Node.js**: Runtime environment cho JavaScript
  - **Express**: Web framework
  - **TypeScript**: Type safety cho backend
  - **MongoDB + Mongoose**: Database và ODM
  - **Socket.IO**: WebSocket library cho real-time communication
  - **JWT**: Authentication và authorization

- **ML Service**:
  - **Python 3**: Ngôn ngữ lập trình cho machine learning
  - **scikit-learn**: Thư viện machine learning (Logistic Regression, TF-IDF)
  - **Flask**: Web framework cho API
  - **Joblib**: Lưu trữ và load mô hình ML

### 4.3. Phương pháp phát triển chatbot AI

- **Intent Classification (Phân loại ý định)**:
  - **Phương pháp**: Supervised Learning
  - **Mô hình**: Logistic Regression với TF-IDF Vectorizer
  - **Quy trình**:
    1. Thu thập và gán nhãn dữ liệu training (câu hỏi và intent tương ứng)
    2. Vectorize câu hỏi bằng TF-IDF
    3. Train mô hình Logistic Regression
    4. Lưu mô hình đã train để sử dụng trong production

- **Context Management (Quản lý ngữ cảnh)**:
  - Sử dụng session state để lưu trữ ngữ cảnh cuộc hội thoại
  - Ghi nhớ intent và thông tin môn học được hỏi gần nhất
  - Cho phép chatbot hiểu câu hỏi tiếp theo mà không cần lặp lại thông tin

- **Rule-based Logic (Logic dựa trên quy tắc)**:
  - Mỗi intent được xử lý bởi một hàm logic riêng
  - Các hàm logic truy vấn dữ liệu từ backend
  - Tính toán và format kết quả theo quy tắc nghiệp vụ
  - Hỗ trợ tiếng Việt không dấu thông qua normalization

- **Data Integration (Tích hợp dữ liệu)**:
  - Chatbot kết nối với backend API để lấy dữ liệu thực tế của sinh viên
  - Dữ liệu được sử dụng để trả lời câu hỏi cá nhân hóa
  - Đảm bảo tính chính xác và cập nhật của thông tin

---

## 5. PHƯƠNG PHÁP KIỂM THỬ

### 5.1. Kiểm thử chức năng

- **Kiểm thử đơn vị (Unit Testing)**: Kiểm thử từng hàm, component riêng lẻ:
  - Kiểm thử các hàm tính toán GPA, tín chỉ
  - Kiểm thử các hàm chuyển đổi điểm số (hệ 10 ↔ hệ 4)
  - Kiểm thử các component React

- **Kiểm thử tích hợp (Integration Testing)**: Kiểm thử sự tương tác giữa các thành phần:
  - Kiểm thử API endpoints
  - Kiểm thử kết nối giữa frontend và backend
  - Kiểm thử kết nối giữa backend và ML service

- **Kiểm thử hệ thống (System Testing)**: Kiểm thử toàn bộ hệ thống:
  - Kiểm thử các luồng nghiệp vụ chính
  - Kiểm thử tính năng real-time (WebSocket)
  - Kiểm thử hiệu suất và khả năng chịu tải

### 5.2. Kiểm thử giao diện người dùng

- **Kiểm thử tính khả dụng (Usability Testing)**:
  - Kiểm thử với người dùng thực tế (sinh viên)
  - Thu thập phản hồi về giao diện và trải nghiệm người dùng
  - Điều chỉnh dựa trên phản hồi

- **Kiểm thử responsive**: Kiểm thử giao diện trên nhiều kích thước màn hình:
  - Desktop (1920x1080, 1366x768)
  - Tablet (768x1024)
  - Mobile (375x667, 414x896)

### 5.3. Kiểm thử chatbot AI

- **Kiểm thử độ chính xác của intent classification**:
  - Test với các câu hỏi mẫu
  - Đo độ chính xác (accuracy) của mô hình
  - Cải thiện mô hình dựa trên kết quả

- **Kiểm thử logic trả lời**:
  - Kiểm thử các hàm logic với dữ liệu mẫu
  - Đảm bảo kết quả trả lời chính xác và đầy đủ
  - Kiểm thử xử lý edge cases (dữ liệu thiếu, dữ liệu không hợp lệ)

- **Kiểm thử context management**:
  - Kiểm thử khả năng ghi nhớ ngữ cảnh
  - Kiểm thử xử lý câu hỏi tiếp theo dựa trên ngữ cảnh

---

## 6. PHƯƠNG PHÁP ĐÁNH GIÁ VÀ PHÂN TÍCH

### 6.1. Đánh giá hiệu suất hệ thống

- **Đo lường hiệu suất**:
  - Thời gian phản hồi của API
  - Thời gian tải trang
  - Hiệu suất truy vấn database
  - Hiệu suất xử lý của chatbot

- **Tối ưu hóa**:
  - Tối ưu truy vấn database (indexing, query optimization)
  - Tối ưu bundle size của frontend
  - Caching để giảm tải server

### 6.2. Đánh giá chất lượng chatbot

- **Độ chính xác của intent classification**:
  - Đo accuracy, precision, recall của mô hình
  - Cải thiện mô hình bằng cách thêm dữ liệu training

- **Chất lượng câu trả lời**:
  - Đánh giá tính chính xác của thông tin
  - Đánh giá tính đầy đủ và hữu ích của câu trả lời
  - Thu thập phản hồi từ người dùng

### 6.3. Đánh giá trải nghiệm người dùng

- **Khảo sát người dùng**:
  - Thu thập phản hồi từ sinh viên sử dụng hệ thống
  - Đánh giá mức độ hài lòng
  - Xác định các điểm cần cải thiện

- **Phân tích sử dụng**:
  - Theo dõi các tính năng được sử dụng nhiều nhất
  - Xác định các tính năng ít được sử dụng
  - Điều chỉnh và cải thiện dựa trên dữ liệu sử dụng

---

## 7. PHƯƠNG PHÁP TRIỂN KHAI

### 7.1. Môi trường phát triển

- **Local Development**:
  - Frontend: Vite dev server (http://localhost:5173)
  - Backend: Node.js server (http://localhost:5000)
  - ML Service: Flask server (http://localhost:5001)
  - Database: MongoDB local hoặc MongoDB Atlas

### 7.2. Môi trường production

- **Deployment strategy**:
  - Frontend: Build static files và deploy lên web server hoặc CDN
  - Backend: Deploy lên cloud server (AWS, Azure, hoặc VPS)
  - ML Service: Deploy lên cloud server hoặc container (Docker)
  - Database: MongoDB Atlas hoặc self-hosted MongoDB

- **CI/CD (Continuous Integration/Continuous Deployment)**:
  - Sử dụng GitHub Actions để tự động build và test
  - Tự động deploy khi có commit mới (tùy chọn)

---

## 8. KẾT LUẬN

Phương pháp nghiên cứu của dự án kết hợp giữa nghiên cứu lý thuyết và phát triển thực nghiệm, sử dụng các phương pháp hiện đại trong phát triển phần mềm và machine learning. Quy trình nghiên cứu được thực hiện một cách có hệ thống, từ thu thập yêu cầu đến thiết kế, phát triển, kiểm thử và đánh giá, đảm bảo chất lượng và tính khả thi của hệ thống.

Các phương pháp được áp dụng trong dự án bao gồm:
- Phương pháp nghiên cứu tài liệu và khảo sát để thu thập yêu cầu
- Phương pháp thiết kế kiến trúc microservices và component-based
- Phương pháp phát triển Agile/Iterative
- Phương pháp machine learning (supervised learning) cho chatbot
- Phương pháp kiểm thử đa tầng (unit, integration, system)
- Phương pháp đánh giá dựa trên hiệu suất và phản hồi người dùng

Với phương pháp nghiên cứu này, dự án đã xây dựng thành công một hệ thống quản lý tiến độ học tập toàn diện, đáp ứng các yêu cầu thực tế của sinh viên và có khả năng mở rộng trong tương lai.


