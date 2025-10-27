import { ProgressData } from '../types/progress';

// Dữ liệu mẫu 9 học kỳ cho chuyên ngành Phát triển ứng dụng ĐPT
// Bạn có thể thay đổi credit/tên môn theo ảnh đã gửi; đây là skeleton dễ chỉnh sửa.

export const progressDevSample: ProgressData = {
  specialization: 'dev',
  semesters: [
    {
      semester: 'HK1',
      courses: [
        { code: 'BAS1105M', name: 'Giáo dục quốc phòng', credit: 3, grade: 8.8, status: 'passed', countInCredits: false, countInGpa: false },
        { code: 'BAS1106', name: 'Giáo dục thể chất 1', credit: 2, grade: 7.2, status: 'passed', countInCredits: false, countInGpa: false },
        { code: 'BAS1150', name: 'Triết học Mác - Lênin', credit: 3, grade: 6.6, status: 'passed' },
        { code: 'BAS1219', name: 'Toán cao cấp 1', credit: 2, grade: 5.3, status: 'passed' },
        { code: 'INT1154', name: 'Tin học cơ sở 1', credit: 2, grade: 3.8, status: 'failed' },
        { code: 'MUL1238', name: 'Cơ sở tạo hình', credit: 3 },
        { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credit: 2, grade: 9.2, status: 'passed' }
      ]
    },
    {
      semester: 'HK2',
      courses: [
        { code: 'BAS1107', name: 'Giáo dục thể chất 2', credit: 2, countInCredits: false, countInGpa: false },
        { code: 'BAS1151', name: 'Kinh tế chính trị Mác - Lênin', credit: 2 },
        { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credit: 4 },
        { code: 'BAS1220', name: 'Toán cao cấp 2', credit: 2 },
        { code: 'INT1155', name: 'Tin học cơ sở 2', credit: 2 },
        { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credit: 2 },
        { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credit: 3 },
        { code: 'MUL13150', name: 'Thiết kế đồ họa', credit: 3 }
      ]
    },
    {
      semester: 'HK3',
      courses: [
        { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credit: 2 },
        { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credit: 4 },
        { code: 'BAS1226', name: 'Xác suất thống kê', credit: 2 },
        { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credit: 3 },
        { code: 'INT1358', name: 'Toán rời rạc 1', credit: 3 },
        { code: 'MUL1314', name: 'Kỹ thuật quay phim', credit: 3 },
        { code: 'MUL14134', name: 'Thiết kế hình động 1', credit: 3 },
        { code: 'SKD1102', name: 'Kỹ năng làm việc nhóm', credit: 2, countInCredits: false, countInGpa: false }
      ]
    },
    {
      semester: 'HK4',
      courses: [
        { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credit: 2 },
        { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credit: 4 },
        { code: 'INT1306', name: 'Cấu trúc dữ liệu và giải thuật', credit: 2 },
        { code: 'INT1325', name: 'Kiến trúc máy tính và hệ điều hành', credit: 4 },
        { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credit: 2 },
        { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credit: 3 },
        { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credit: 3 },
        { code: 'SKD1103', name: 'Kỹ năng tạo lập Văn bản', credit: 2, countInCredits: false, countInGpa: false }
      ]
    },
    {
      semester: 'HK5',
      courses: [
        { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản Việt Nam', credit: 2 },
        { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credit: 2 },
        { code: 'MUL13108', name: 'Ngôn ngữ lập trình Java', credit: 3 },
        { code: 'MUL13124', name: 'Dựng audio và video phi tuyến', credit: 3 },
        { code: 'MUL13152', name: 'Thiết kế web cơ bản', credit: 3 },
        { code: 'MUL1415', name: 'Kỹ xảo đa phương tiện', credit: 2 },
        { code: 'MUL1422', name: 'Tổ chức sản xuất sản phẩm đa phương tiện', credit: 3 },
        { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credit: 3 }
      ]
    },
    {
      semester: 'HK6',
      courses: [
        { code: 'INT13110', name: 'Lập trình mạng với C++', credit: 3 },
        { code: 'INT13111', name: 'Kỹ thuật đồ họa', credit: 3 },
        { code: 'INT1313', name: 'Cơ sở dữ liệu', credit: 3 },
        { code: 'INT1340', name: 'Nhập môn công nghệ phần mềm', credit: 3 },
        { code: 'MUL13148', name: 'Bản quyền số', credit: 2 },
        { code: 'MUL14126', name: 'Lập trình âm thanh', credit: 2 },
        { code: 'SKD1101', name: 'Kỹ năng thuyết trình', credit: 2, countInCredits: false, countInGpa: false },
        { code: 'SKD1108', name: 'Phương pháp luận nghiên cứu khoa học', credit: 2 }
      ]
    },
    {
      semester: 'HK7',
      courses: [
        { code: 'ELE14104', name: 'Thị giác máy tính', credit: 3 },
        { code: 'INT1434', name: 'Lập trình Web', credit: 3 },
        { code: 'MUL14125', name: 'Xử lý ảnh và video', credit: 3 },
        { code: 'MUL1446', name: 'Lập trình game cơ bản', credit: 3 },
        { code: 'MUL1448', name: 'Lập trình ứng dụng trên đầu cuối di động', credit: 3 },
        { code: 'MUL1451', name: 'Chuyên đề phát triển ứng dụng đa phương tiện', credit: 1 }
      ]
    },
    {
      semester: 'HK8',
      courses: [
        { code: 'INT14165', name: 'An toàn thông tin', credit: 3 },
        { code: 'MUL14129', name: 'Phát triển ứng dụng thực tại ảo', credit: 3 },
        { code: 'MUL14130', name: 'Khai phá dữ liệu đa phương tiện', credit: 3 },
        { code: 'MUL14154', name: 'Phát triển ứng dụng IoT', credit: 3 },
        { code: 'MUL14204', name: 'Thực tập chuyên sâu', credit: 4 }
      ]
    },
    {
      semester: 'HK9',
      courses: [
        { code: 'CDT1434', name: 'Đồ án tốt nghiệp', credit: 6 },
        { code: 'MUL2019', name: 'Thực tập tốt nghiệp', credit: 6 }
      ]
    }
  ]
};


