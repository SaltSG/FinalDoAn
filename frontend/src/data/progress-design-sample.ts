import { ProgressData } from '../types/progress';

// Chuyên ngành Thiết kế đa phương tiện
export const progressDesignSample: ProgressData = {
  specialization: 'design',
  semesters: [
    {
      semester: 'HK1',
      courses: [
        { code: 'BAS1150', name: 'Triết học Mác - Lênin', credit: 3 },
        { code: 'INT1154', name: 'Tin học cơ sở 1', credit: 2 },
        { code: 'MUL1238', name: 'Cơ sở tạo hình', credit: 3 },
        { code: 'BAS1219', name: 'Toán cao cấp 1', credit: 2 },
        { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credit: 2 }
      ]
    },
    {
      semester: 'HK2',
      courses: [
        { code: 'BAS1151', name: 'Kinh tế chính trị Mác - Lênin', credit: 2 },
        { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credit: 4 },
        { code: 'INT1155', name: 'Tin học cơ sở 2', credit: 2 },
        { code: 'BAS1220', name: 'Toán cao cấp 2', credit: 2 },
        { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credit: 2 },
        { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credit: 3 },
        { code: 'MUL13150', name: 'Thiết kế đồ họa', credit: 2 }
      ]
    },
    {
      semester: 'HK3',
      courses: [
        { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credit: 2 },
        { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credit: 4 },
        { code: 'INT1358', name: 'Toán rời rạc 1', credit: 3 },
        { code: 'BAS1226', name: 'Xác suất thống kê', credit: 2 },
        { code: 'MUL14134', name: 'Thiết kế hình động 1', credit: 3 },
        { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credit: 3 },
        { code: 'MUL1314', name: 'Kỹ thuật quay phim', credit: 3 }
      ]
    },
    {
      semester: 'HK4',
      courses: [
        { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credit: 2 },
        { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credit: 4 },
        { code: 'INT1306', name: 'Pháp luật đại cương', credit: 2 },
        { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credit: 3 },
        { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credit: 3 },
        { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credit: 2 },
        { code: 'MUL1422', name: 'Tổ chức sản xuất sản phẩm ĐPT', credit: 2 },
        { code: 'MUL13124', name: 'Dựng audio và video phi tuyến', credit: 3 }
      ]
    },
    {
      semester: 'HK5',
      courses: [
        { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản VN', credit: 2 },
        { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credit: 2 },
        { code: 'MUL13152', name: 'Thiết kế web cơ bản', credit: 3 },
        { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credit: 2 },
        { code: 'MUL1415', name: 'Kỹ xảo đa phương tiện', credit: 2 },
        { code: 'DES1501', name: 'Tư duy thiết kế', credit: 2 },
        { code: 'INT1340', name: 'Nhập môn công nghệ phần mềm', credit: 3 },
        { code: 'ELE15TC', name: 'Học phần tự chọn', credit: 3 }
      ]
    },
    {
      semester: 'HK6',
      courses: [
        { code: 'DES1601', name: 'Cơ sở tạo hình nâng cao', credit: 3 },
        { code: 'DES1602', name: 'Thiết kế sản phẩm ĐPT', credit: 3 },
        { code: 'DES1603', name: 'Thiết kế hình động 2', credit: 3 },
        { code: 'DES1604', name: 'Nghệ thuật đồ họa chữ (Typography)', credit: 3 },
        { code: 'DES1605', name: 'Luật xa gần', credit: 2 },
        { code: 'ELE16TC', name: 'Học phần tự chọn', credit: 3 }
      ]
    },
    {
      semester: 'HK7',
      courses: [
        { code: 'DES1701', name: 'Kịch bản phân cảnh', credit: 3 },
        { code: 'DES1702', name: 'Thiết kế sản phẩm điện tử 1', credit: 3 },
        { code: 'DES1703', name: 'Thiết kế ứng dụng trên đầu cuối di động', credit: 3 },
        { code: 'DES1704', name: 'Thiết kế hình động 3D', credit: 3 },
        { code: 'DES1705', name: 'Thiết kế game', credit: 3 },
        { code: 'ELE17TC', name: 'Học phần tự chọn', credit: 3 }
      ]
    },
    {
      semester: 'HK8',
      courses: [
        { code: 'DES1801', name: 'Đồ án thiết kế sản phẩm ĐPT', credit: 2 },
        { code: 'BASPPNCKH', name: 'Phương pháp luận NCKH', credit: 2 },
        { code: 'MUL14148', name: 'Bản quyền số', credit: 2 },
        { code: 'ELE18TC', name: 'Học phần tự chọn', credit: 3 },
        { code: 'DES1805', name: 'Thực hành chuyên sâu', credit: 4 },
        { code: 'DES1806', name: 'Chuyên đề Thiết kế ĐPT', credit: 1 }
      ]
    },
    {
      semester: 'HK9',
      courses: [
        { code: 'DES1901', name: 'Thực tập và tốt nghiệp', credit: 12 }
      ]
    }
  ]
};


