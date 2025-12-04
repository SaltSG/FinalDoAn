# LÝ DO CHỌN ĐỀ TÀI

## ĐỀ TÀI: XÂY DỰNG HỆ THỐNG QUẢN LÝ TIẾN ĐỘ HỌC TẬP CÁ NHÂN CHO SINH VIÊN NGÀNH CÔNG NGHỆ ĐA PHƯƠNG TIỆN

---

## 1. ĐẶT VẤN ĐỀ

### 1.1. Bối cảnh thực tế

Trong bối cảnh giáo dục đại học hiện đại, việc quản lý tiến độ học tập của sinh viên đang trở thành một thách thức lớn. Đặc biệt đối với sinh viên ngành Công nghệ đa phương tiện tại Học viện Công nghệ Bưu chính Viễn thông (PTIT), việc theo dõi và quản lý quá trình học tập gặp nhiều khó khăn do:

- **Chương trình đào tạo phức tạp**: Chương trình học được chia thành nhiều học kỳ với hàng trăm môn học khác nhau, mỗi môn có yêu cầu về tín chỉ, điểm số, và điều kiện đạt/không đạt riêng biệt.

- **Đa dạng về chuyên ngành**: Sinh viên có thể lựa chọn giữa hai chuyên ngành chính là Phát triển phần mềm (Dev) và Thiết kế đa phương tiện (Design), mỗi chuyên ngành có lộ trình học tập và yêu cầu tốt nghiệp khác nhau.

- **Quy định phức tạp về điểm số**: Hệ thống điểm số sử dụng cả thang điểm 10 và thang điểm 4, với các quy định về tính điểm trung bình tích lũy (GPA), điểm theo học kỳ, và các môn không tính vào GPA.

- **Yêu cầu quản lý deadline và lịch học**: Sinh viên phải quản lý nhiều deadline khác nhau từ các môn học, đồ án, bài tập lớn, cùng với lịch thi, lịch học trên lớp.

### 1.2. Vấn đề cụ thể mà sinh viên đang gặp phải

#### 1.2.1. Khó khăn trong việc theo dõi tiến độ học tập

Hiện tại, sinh viên phải tự tính toán và theo dõi tiến độ học tập của mình một cách thủ công, dẫn đến nhiều vấn đề:

- **Tính toán GPA thủ công dễ sai sót**: Việc tính điểm trung bình tích lũy (GPA) đòi hỏi phải nhớ và áp dụng đúng công thức, xét đến các môn tính/không tính vào GPA, hệ số tín chỉ của từng môn. Một sai sót nhỏ có thể dẫn đến kết quả không chính xác.

- **Khó theo dõi tín chỉ đã tích lũy**: Sinh viên cần biết mình đã tích lũy được bao nhiêu tín chỉ, còn thiếu bao nhiêu tín chỉ để đủ điều kiện tốt nghiệp. Việc tính toán này phức tạp vì phải xét đến:
  - Các môn đã đạt (passed) mới được tính vào tín chỉ tích lũy
  - Các môn không tính vào tín chỉ (countInCredits = false) phải được loại trừ
  - Tổng tín chỉ yêu cầu khác nhau tùy theo chuyên ngành

- **Thiếu cái nhìn tổng quan về tiến độ**: Sinh viên khó có được cái nhìn tổng quan về tiến độ học tập của mình qua các học kỳ, không biết mình đang ở đâu trong lộ trình học tập, còn bao nhiêu học kỳ nữa để tốt nghiệp.

#### 1.2.2. Quản lý deadline và lịch học thiếu hiệu quả

Sinh viên phải đối mặt với nhiều deadline và sự kiện học tập khác nhau:

- **Deadline từ nhiều nguồn**: Deadline có thể đến từ các môn học khác nhau, đồ án, bài tập lớn, với mức độ ưu tiên và thời hạn khác nhau. Việc quản lý bằng giấy ghi chú hoặc ứng dụng lịch chung dễ dẫn đến việc bỏ sót hoặc nhầm lẫn.

- **Lịch thi và lịch học phức tạp**: Lịch thi có thể thay đổi, lịch học trên lớp cần được cập nhật thường xuyên. Việc quản lý song song giữa deadline và lịch học/lịch thi trên các nền tảng khác nhau gây khó khăn.

- **Thiếu cảnh báo và nhắc nhở**: Sinh viên thường chỉ nhận ra deadline sắp đến khi đã quá gần, không có đủ thời gian để chuẩn bị tốt.

#### 1.2.3. Thiếu công cụ hỗ trợ tư vấn học tập

Sinh viên cần được tư vấn về học tập nhưng gặp nhiều hạn chế:

- **Khó tiếp cận cố vấn học tập**: Cố vấn học tập không phải lúc nào cũng có sẵn để trả lời các câu hỏi của sinh viên, đặc biệt là vào buổi tối hoặc cuối tuần.

- **Thiếu thông tin cá nhân hóa**: Các câu hỏi của sinh viên thường mang tính cá nhân cao, cần dựa trên dữ liệu học tập thực tế của từng sinh viên (điểm số, tín chỉ, môn nợ, v.v.). Việc tư vấn chung chung không đáp ứng được nhu cầu này.

- **Thiếu công cụ đánh giá khả năng tốt nghiệp**: Sinh viên muốn biết liệu mình có thể tốt nghiệp đúng hạn hay không, nhưng việc đánh giá này đòi hỏi phải xét đến nhiều yếu tố: GPA hiện tại, tín chỉ đã tích lũy, số môn nợ, số học kỳ còn lại, v.v. Việc tính toán thủ công rất phức tạp và dễ sai sót.

#### 1.2.4. Thiếu công cụ phân tích và cảnh báo

Sinh viên cần được cảnh báo sớm về các vấn đề học tập:

- **Cảnh báo học tập**: Theo quy định của nhà trường, sinh viên có thể bị cảnh báo học tập khi GPA học kỳ hoặc GPA tích lũy thấp hơn ngưỡng quy định. Tuy nhiên, sinh viên thường chỉ biết khi đã nhận được thông báo chính thức, không có công cụ để tự đánh giá trước.

- **Phân tích điểm mạnh/điểm yếu**: Sinh viên muốn biết mình học tốt ở những môn nào, yếu ở những môn nào để có kế hoạch cải thiện, nhưng việc phân tích này đòi hỏi phải xem xét toàn bộ bảng điểm và so sánh.

- **Thiếu dự đoán và gợi ý**: Sinh viên không biết nên đăng ký môn nào trong học kỳ tới để tối ưu GPA hoặc đảm bảo đủ tín chỉ tốt nghiệp.

---

## 2. MỤC TIÊU VÀ GIẢI PHÁP

### 2.1. Mục tiêu chính của đề tài

Đề tài nhằm xây dựng một **hệ thống quản lý tiến độ học tập cá nhân** toàn diện, giúp sinh viên:

1. **Tự động hóa việc quản lý và theo dõi tiến độ học tập**: Hệ thống tự động tính toán GPA, tín chỉ đã tích lũy, tín chỉ còn thiếu dựa trên dữ liệu điểm số thực tế của sinh viên.

2. **Tích hợp quản lý deadline và lịch học**: Cung cấp một nền tảng thống nhất để quản lý deadline, lịch thi, lịch học với giao diện trực quan, dễ sử dụng.

3. **Cung cấp chatbot AI hỗ trợ học tập**: Xây dựng chatbot thông minh có thể trả lời các câu hỏi của sinh viên về học tập dựa trên dữ liệu cá nhân của họ.

4. **Phân tích và cảnh báo**: Tự động đánh giá khả năng tốt nghiệp, cảnh báo học tập, phân tích điểm mạnh/điểm yếu để giúp sinh viên có kế hoạch học tập tốt hơn.

5. **Cá nhân hóa theo chuyên ngành**: Hệ thống hỗ trợ cả hai chuyên ngành Dev và Design, với lộ trình học tập và yêu cầu tốt nghiệp phù hợp với từng chuyên ngành.

### 2.2. Giải pháp cụ thể

#### 2.2.1. Hệ thống quản lý tiến độ học tập tự động

Hệ thống cung cấp các tính năng:

- **Dashboard tổng quan**: Hiển thị thông tin tổng quan về tiến độ học tập: GPA hiện tại, tín chỉ đã tích lũy, tín chỉ còn thiếu, số môn nợ, mục tiêu bằng tốt nghiệp (Khá, Giỏi, Xuất sắc).

- **Trang Tiến độ (Progress)**: Hiển thị chi tiết tiến độ học tập theo từng học kỳ, với mã màu phân biệt các loại môn học (bắt buộc chung, cơ sở ngành, chuyên ngành, thực tập, luận văn, tự chọn). Sinh viên có thể chọn học kỳ hiện tại và xem tiến độ của mình.

- **Trang Kết quả (Results)**: Cho phép sinh viên nhập và cập nhật điểm số cho từng môn học theo từng học kỳ. Hệ thống tự động tính toán GPA và cập nhật tiến độ. Sinh viên có thể đặt mục tiêu bằng tốt nghiệp và hệ thống sẽ hiển thị tiến độ đạt mục tiêu đó.

- **Tính toán tự động**: Hệ thống tự động:
  - Tính GPA học kỳ và GPA tích lũy theo đúng công thức của nhà trường
  - Tính tín chỉ đã tích lũy (chỉ tính các môn đạt và có countInCredits = true)
  - Tính tín chỉ còn thiếu để đủ điều kiện tốt nghiệp
  - Xác định các môn nợ (môn có điểm F hoặc status = 'failed')

#### 2.2.2. Hệ thống quản lý deadline và lịch học tích hợp

Hệ thống cung cấp:

- **Trang Deadline**: Cho phép sinh viên tạo, chỉnh sửa, xóa deadline với thông tin đầy đủ: tiêu đề, thời gian bắt đầu, thời gian kết thúc, ghi chú. Deadline được hiển thị dưới dạng danh sách có thể sắp xếp và lọc.

- **Trang Lịch (Calendar)**: Tích hợp FullCalendar để hiển thị deadline, lịch thi, và sự kiện học tập trên lịch tháng/tuần/ngày. Sinh viên có thể:
  - Xem tất cả deadline và sự kiện trên một lịch duy nhất
  - Tạo sự kiện học tập mới (lịch thi, lịch học)
  - Chỉnh sửa và xóa sự kiện
  - Xem deadline sắp đến với màu sắc phân biệt

- **Cảnh báo deadline**: Hệ thống có thể cảnh báo deadline sắp đến (ví dụ: trong 3 ngày tới) để sinh viên có thời gian chuẩn bị.

#### 2.2.3. Chatbot AI hỗ trợ học tập thông minh

Hệ thống tích hợp chatbot được xây dựng bằng Python với các tính năng:

- **Nhận diện ý định (Intent Classification)**: Sử dụng mô hình machine learning để phân loại câu hỏi của sinh viên vào các nhóm: hỏi về GPA, hỏi về điểm môn học, hỏi về tín chỉ, hỏi về deadline, hỏi về khả năng tốt nghiệp, v.v.

- **Truy vấn dữ liệu cá nhân**: Chatbot kết nối với backend để lấy dữ liệu thực tế của sinh viên (điểm số, GPA, tín chỉ, deadline, môn nợ) và trả lời dựa trên dữ liệu đó.

- **Ghi nhớ ngữ cảnh**: Chatbot có khả năng ghi nhớ ngữ cảnh cuộc hội thoại, cho phép sinh viên hỏi tiếp theo mà không cần lặp lại thông tin (ví dụ: sau khi hỏi "Điểm môn Toán cao cấp 1?", sinh viên có thể hỏi "Còn môn Cơ sở dữ liệu?" mà chatbot vẫn hiểu đang hỏi về điểm).

- **Hỗ trợ đa dạng câu hỏi**: Chatbot có thể trả lời:
  - Câu hỏi về GPA và điểm số (theo môn, theo học kỳ, tích lũy)
  - Câu hỏi về tín chỉ (đã tích lũy, còn thiếu, môn nợ)
  - Câu hỏi về deadline (deadline sắp đến, deadline đã qua)
  - Câu hỏi về khả năng tốt nghiệp (đánh giá khả năng tốt nghiệp đúng hạn)
  - Câu hỏi về cảnh báo học tập
  - Câu hỏi về phân tích điểm mạnh/điểm yếu
  - Câu hỏi về thông tin môn học (tín chỉ, mã môn, hình thức thi)

- **Hỗ trợ tiếng Việt không dấu**: Chatbot có thể hiểu câu hỏi tiếng Việt không dấu, giúp sinh viên gõ nhanh hơn.

#### 2.2.4. Hệ thống phân tích và cảnh báo

Hệ thống cung cấp các tính năng phân tích:

- **Đánh giá khả năng tốt nghiệp đúng hạn**: Hệ thống tự động đánh giá dựa trên:
  - GPA hiện tại so với yêu cầu tối thiểu (GPA >= 2.0 hệ 4)
  - Tín chỉ đã tích lũy so với yêu cầu tốt nghiệp
  - Số môn nợ và tín chỉ của các môn nợ
  - Ước lượng số học kỳ còn lại dựa trên tiến độ hiện tại
  - Đưa ra đánh giá: CAO / TRUNG BÌNH / THẤP về khả năng tốt nghiệp đúng hạn

- **Cảnh báo học tập**: Hệ thống tự động kiểm tra và cảnh báo khi:
  - GPA học kỳ chính < 1.0 (hệ 4)
  - GPA tích lũy < ngưỡng quy định theo năm học: 1.20 (năm 1), 1.40 (năm 2), 1.60 (năm 3), 1.80 (năm 4+)

- **Phân tích điểm mạnh/điểm yếu**: Hệ thống phân tích và liệt kê:
  - Các môn học tốt nhất (điểm cao nhất)
  - Các môn học kém nhất (điểm thấp nhất hoặc trượt)
  - Đưa ra nhận xét và gợi ý cải thiện

#### 2.2.5. Hệ thống quản lý chuyên ngành

Hệ thống hỗ trợ:

- **Lựa chọn chuyên ngành**: Sinh viên có thể chọn chuyên ngành Dev hoặc Design, hệ thống sẽ tự động tải chương trình đào tạo phù hợp.

- **Quản lý chương trình đào tạo**: Admin có thể quản lý chương trình đào tạo cho từng chuyên ngành, bao gồm:
  - Thêm, sửa, xóa môn học trong từng học kỳ
  - Cập nhật thông tin môn học: mã môn, tên môn, số tín chỉ, có tính vào GPA/credits hay không, loại môn học
  - Quản lý hình thức thi cho từng môn

---

## 3. TÍNH MỚI VÀ ĐÓNG GÓP CỦA ĐỀ TÀI

### 3.1. Tính mới về công nghệ

- **Tích hợp AI/ML vào quản lý học tập**: Đề tài ứng dụng công nghệ AI/ML để xây dựng chatbot hỗ trợ học tập thông minh, có khả năng hiểu ngữ cảnh và trả lời câu hỏi dựa trên dữ liệu cá nhân của sinh viên.

- **Kiến trúc microservices**: Hệ thống được xây dựng với kiến trúc tách biệt giữa frontend (React), backend (Node.js), và ML service (Python), cho phép mở rộng và bảo trì dễ dàng.

- **Real-time synchronization**: Hệ thống sử dụng WebSocket để đồng bộ dữ liệu real-time giữa các client, đảm bảo dữ liệu luôn được cập nhật.

### 3.2. Tính mới về tính năng

- **Tích hợp đa chức năng trong một nền tảng**: Khác với các hệ thống hiện có thường chỉ tập trung vào một chức năng (ví dụ: chỉ quản lý điểm, chỉ quản lý lịch), hệ thống này tích hợp nhiều chức năng: quản lý tiến độ, quản lý deadline, chatbot hỗ trợ, phân tích và cảnh báo.

- **Cá nhân hóa sâu**: Hệ thống cung cấp trải nghiệm cá nhân hóa cao, với dữ liệu và gợi ý dựa trên tiến độ học tập thực tế của từng sinh viên.

- **Hỗ trợ đa chuyên ngành**: Hệ thống hỗ trợ nhiều chuyên ngành khác nhau với lộ trình học tập riêng biệt, có thể dễ dàng mở rộng thêm chuyên ngành mới.

### 3.3. Đóng góp thực tiễn

- **Giúp sinh viên quản lý học tập hiệu quả hơn**: Hệ thống tự động hóa các công việc tính toán thủ công, giúp sinh viên tiết kiệm thời gian và giảm sai sót.

- **Nâng cao nhận thức về tiến độ học tập**: Sinh viên có cái nhìn rõ ràng về tiến độ học tập của mình, biết mình đang ở đâu và cần làm gì để đạt mục tiêu.

- **Hỗ trợ ra quyết định học tập**: Hệ thống cung cấp thông tin và phân tích để giúp sinh viên ra quyết định học tập tốt hơn (ví dụ: nên học lại môn nào, nên đăng ký môn nào trong học kỳ tới).

- **Góp phần nâng cao chất lượng học tập**: Bằng cách cảnh báo sớm và phân tích điểm mạnh/điểm yếu, hệ thống giúp sinh viên cải thiện kết quả học tập và tăng tỷ lệ tốt nghiệp đúng hạn.

---

## 4. Ý NGHĨA THỰC TIỄN VÀ KHẢ NĂNG ỨNG DỤNG

### 4.1. Ý nghĩa đối với sinh viên

- **Tiết kiệm thời gian**: Sinh viên không cần phải tính toán thủ công GPA, tín chỉ, không cần phải quản lý deadline trên nhiều nền tảng khác nhau.

- **Giảm sai sót**: Việc tính toán tự động giúp giảm thiểu sai sót so với tính toán thủ công.

- **Tăng hiệu quả học tập**: Sinh viên có thể tập trung vào việc học thay vì lo lắng về việc quản lý thông tin học tập.

- **Hỗ trợ 24/7**: Chatbot có thể trả lời câu hỏi của sinh viên bất cứ lúc nào, không cần chờ cố vấn học tập.

### 4.2. Ý nghĩa đối với nhà trường

- **Giảm tải công việc cho cố vấn học tập**: Chatbot có thể trả lời nhiều câu hỏi thường gặp, giúp cố vấn học tập tập trung vào các vấn đề phức tạp hơn.

- **Nâng cao tỷ lệ tốt nghiệp đúng hạn**: Bằng cách giúp sinh viên quản lý học tập tốt hơn và cảnh báo sớm về các vấn đề, hệ thống góp phần nâng cao tỷ lệ tốt nghiệp đúng hạn.

- **Cải thiện chất lượng giáo dục**: Hệ thống cung cấp dữ liệu và phân tích để nhà trường có thể đánh giá và cải thiện chương trình đào tạo.

### 4.3. Khả năng ứng dụng và mở rộng

- **Áp dụng cho các ngành khác**: Hệ thống có thể được mở rộng để hỗ trợ các ngành học khác, chỉ cần cập nhật chương trình đào tạo và quy định tính điểm.

- **Tích hợp với hệ thống quản lý học tập hiện có**: Hệ thống có thể được tích hợp với các hệ thống quản lý học tập hiện có của nhà trường để tự động lấy dữ liệu điểm số, lịch học.

- **Mở rộng tính năng**: Hệ thống có thể được mở rộng thêm các tính năng như:
  - Gợi ý môn học nên đăng ký trong học kỳ tới
  - Dự đoán GPA tương lai dựa trên xu hướng
  - Gợi ý học bổng dựa trên điều kiện GPA và tín chỉ
  - Phân tích xu hướng học tập qua các học kỳ

---

## 5. KẾT LUẬN

Đề tài "Xây dựng hệ thống quản lý tiến độ học tập cá nhân cho sinh viên ngành Công nghệ đa phương tiện" được chọn dựa trên các lý do sau:

1. **Giải quyết vấn đề thực tế**: Hệ thống giải quyết các vấn đề cụ thể mà sinh viên đang gặp phải trong việc quản lý học tập, từ tính toán GPA, quản lý deadline, đến tư vấn học tập.

2. **Ứng dụng công nghệ hiện đại**: Đề tài ứng dụng các công nghệ hiện đại như React, Node.js, TypeScript, Python, AI/ML để xây dựng một hệ thống hiện đại, hiệu quả.

3. **Tính thực tiễn cao**: Hệ thống có thể được triển khai và sử dụng ngay, mang lại lợi ích thiết thực cho sinh viên và nhà trường.

4. **Khả năng mở rộng**: Hệ thống được thiết kế với kiến trúc linh hoạt, có thể dễ dàng mở rộng để hỗ trợ thêm chuyên ngành, tính năng mới.

5. **Đóng góp cho giáo dục**: Hệ thống góp phần nâng cao chất lượng giáo dục và hỗ trợ sinh viên trong quá trình học tập.

Với những lý do trên, đề tài này không chỉ có ý nghĩa học thuật mà còn có giá trị thực tiễn cao, đáp ứng nhu cầu thực tế của sinh viên và nhà trường trong việc quản lý và nâng cao chất lượng học tập.

