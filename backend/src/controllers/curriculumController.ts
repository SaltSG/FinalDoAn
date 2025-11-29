import { RequestHandler } from 'express';
import { Curriculum } from '../models/Curriculum';

export const getBySpec: RequestHandler = async (req, res) => {
  const spec = String(req.params.spec);
  const doc = await Curriculum.findOne({ specialization: spec });
  if (!doc) return res.status(404).json({ message: 'Curriculum not found' });

  // Ẩn hoàn toàn các môn không muốn hiển thị (vd: Giáo dục quốc phòng BAS1105M)
  const semestersFiltered = (doc.semesters as any[]).map((sem: any) => ({
    ...sem.toObject?.() ?? sem,
    courses: (sem.courses as any[]).filter((c: any) => c.code !== 'BAS1105M'),
  }));

  let totalCreditsAll = 0;
  let totalCreditsCounted = 0;
  let totalGpaCredits = 0;
  const breakdown: any[] = [];
  for (const sem of semestersFiltered) {
    for (const c of (sem.courses as any[])) {
      totalCreditsAll += c.credit || 0;
      if (c.countInCredits !== false) totalCreditsCounted += c.credit || 0;
      if (c.countInGpa !== false) totalGpaCredits += c.credit || 0;
      breakdown.push({
        semester: sem.semester,
        code: c.code,
        name: c.name,
        credit: c.credit,
        countInCredits: c.countInCredits !== false,
        countInGpa: c.countInGpa !== false,
      });
    }
  }

  return res.json({
    specialization: doc.specialization,
    name: doc.name,
    semesters: semestersFiltered,
    requiredCredits: (doc as any).requiredCredits ?? 150,
    totals: {
      totalCreditsAll,
      totalCreditsCounted,
      totalGpaCredits,
    },
    breakdown,
  });
};

export const addCourse: RequestHandler = async (req, res) => {
  const spec = String(req.params.spec);
  const { semester, code, name, credit, countInGpa, countInCredits, category } = req.body ?? {};
  if (!semester || !code || !name || typeof credit !== 'number') {
    return res.status(400).json({ message: 'semester, code, name, credit are required' });
  }
  let doc = await Curriculum.findOne({ specialization: spec });
  if (!doc) {
    doc = await Curriculum.create({ specialization: spec, name: spec, semesters: [] });
  }
  let sem = doc.semesters.find((s: any) => s.semester === semester) as any;
  if (!sem) {
    sem = { semester, courses: [] } as any;
    (doc.semesters as any).push(sem);
  }
  const dup = (sem.courses as any[]).some((c) => c.code === code);
  if (dup) return res.status(409).json({ message: 'Course code already exists in this semester' });
  const course = {
    code,
    name,
    credit,
    countInGpa: typeof countInGpa === 'boolean' ? countInGpa : true,
    countInCredits: typeof countInCredits === 'boolean' ? countInCredits : true,
    category: typeof category === 'string' ? category : undefined,
  } as any;
  (sem.courses as any[]).push(course);
  await doc.save();
  return res.json({ ok: true, course });
};

export const updateCourse: RequestHandler = async (req, res) => {
  const spec = String(req.params.spec);
  const { code, name, credit, countInGpa, countInCredits, category } = req.body ?? {};
  if (!code) return res.status(400).json({ message: 'code required' });
  const doc = await Curriculum.findOne({ specialization: spec });
  if (!doc) return res.status(404).json({ message: 'Curriculum not found' });

  let updated = 0;
  for (const sem of doc.semesters) {
    for (const c of sem.courses as any[]) {
      if (c.code === code) {
        if (typeof name === 'string') c.name = name;
        if (typeof credit === 'number') c.credit = credit;
        if (typeof countInGpa === 'boolean') c.countInGpa = countInGpa;
        if (typeof countInCredits === 'boolean') c.countInCredits = countInCredits;
        if (typeof category === 'string') c.category = category;
        updated++;
      }
    }
  }
  await doc.save();
  return res.json({ ok: true, updated });
};

export const deleteCourse: RequestHandler = async (req, res) => {
  const spec = String(req.params.spec);
  const code = String(req.query.code || req.body?.code || '');
  if (!code) return res.status(400).json({ message: 'code required' });
  const doc = await Curriculum.findOne({ specialization: spec });
  if (!doc) return res.status(404).json({ message: 'Curriculum not found' });

  let removed = 0;
  for (const sem of doc.semesters as any[]) {
    const before = (sem.courses as any[]).length;
    sem.courses = (sem.courses as any[]).filter((c: any) => c.code !== code);
    removed += before - (sem.courses as any[]).length;
  }
  await doc.save();
  return res.json({ ok: true, removed });
};

export const seed: RequestHandler = async (req, res) => {
  const force = Boolean(req.body?.force);

  const mapSemesters = (raw: any[]): any[] => {
    return raw.map((s: any) => ({
      semester: s.semester,
      courses: (s.courses || []).map((c: any) => ({
        code: c.code,
        name: c.name,
        credit: c.credit,
        countInGpa: c.countInGpa !== false,
        countInCredits: c.countInCredits !== false,
        examFormat: c.examFormat,
        category: c.category,
      })),
    }));
  };

  const devSemesters = mapSemesters([
    { semester: 'HK1', courses: [
      { code: 'BAS1105M', name: 'Giáo dục quốc phòng', credit: 3, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn / Thực hành' },
      { code: 'BAS1106', name: 'Giáo dục thể chất 1', credit: 2, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
      { code: 'BAS1150', name: 'Triết học Mác - Lênin', credit: 3, examFormat: 'Tiểu luận' },
      { code: 'BAS1219', name: 'Toán cao cấp 1', credit: 2, examFormat: 'Thi viết + Vấn đáp' },
      { code: 'INT1154', name: 'Tin học cơ sở 1', credit: 2, examFormat: 'Vấn đáp trực tuyến' },
      { code: 'MUL1238', name: 'Cơ sở tạo hình', credit: 3, examFormat: 'Bài tập lớn + Vấn đáp' },
      { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credit: 2, examFormat: 'Bài tập lớn + Vấn đáp' },
    ]},
    { semester: 'HK2', courses: [
      { code: 'BAS1107', name: 'Giáo dục thể chất 2', credit: 2, countInCredits: false, countInGpa: false, examFormat: 'Thực hành' },
      { code: 'BAS1151', name: 'Kinh tế chính trị Mác - Lênin', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'BAS1220', name: 'Toán cao cấp 2', credit: 2, examFormat: 'Tự luận' },
      { code: 'INT1155', name: 'Tin học cơ sở 2', credit: 2, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL13150', name: 'Thiết kế đồ họa', credit: 3, examFormat: 'Vấn đáp' },
    ]},
    { semester: 'HK3', courses: [
      { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'BAS1226', name: 'Xác suất thống kê', credit: 2, examFormat: 'Tự luận' },
      { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1358', name: 'Toán rời rạc 1', credit: 3, examFormat: 'Tự luận' },
      { code: 'MUL1314', name: 'Kỹ thuật quay phim', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL14134', name: 'Thiết kế hình động 1', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'SKD1102', name: 'Kỹ năng làm việc nhóm', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK4', courses: [
      { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'INT1306', name: 'Cấu trúc dữ liệu và giải thuật', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1325', name: 'Kiến trúc máy tính và hệ điều hành', credit: 2, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'SKD1103', name: 'Kỹ năng tạo lập Văn bản', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK5', courses: [
      { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản Việt Nam', credit: 2, examFormat: 'Trắc nghiệm' },
      { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13108', name: 'Ngôn ngữ lập trình Java', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL13124', name: 'Dựng audio và video phi tuyến', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL13152', name: 'Thiết kế web cơ bản', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL1415', name: 'Kỹ xảo đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
      { code: 'MUL1422', name: 'Tổ chức sản xuất sản phẩm đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
      { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
    ]},
    { semester: 'HK6', courses: [
      { code: 'INT13110', name: 'Lập trình mạng với C++', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT13111', name: 'Kỹ thuật đồ họa', credit: 3, examFormat: 'Tự luận' },
      { code: 'INT1313', name: 'Cơ sở dữ liệu', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1340', name: 'Nhập môn công nghệ phần mềm', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL13148', name: 'Bản quyền số', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL14126', name: 'Lập trình âm thanh', credit: 2, examFormat: 'Vấn đáp' },
      { code: 'SKD1101', name: 'Kỹ năng thuyết trình', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
      { code: 'SKD1108', name: 'Phương pháp luận nghiên cứu khoa học', credit: 2, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK7', courses: [
      { code: 'ELE14104', name: 'Thị giác máy tính', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1434', name: 'Lập trình Web', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL14125', name: 'Xử lý ảnh và video', credit: 3, examFormat: 'Tự luận' },
      { code: 'MUL1446', name: 'Lập trình game cơ bản', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL1448', name: 'Lập trình ứng dụng trên đầu cuối di động', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL1451', name: 'Chuyên đề phát triển ứng dụng đa phương tiện', credit: 1, examFormat: 'Vấn đáp' },
    ]},
    { semester: 'HK8', courses: [
      { code: 'INT14165', name: 'An toàn thông tin', credit: 3, examFormat: 'Tự luận' },
      { code: 'MUL14129', name: 'Phát triển ứng dụng thực tại ảo', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL14130', name: 'Khai phá dữ liệu đa phương tiện', credit: 3, examFormat: 'Bài tập lớn' },
      { code: 'MUL14154', name: 'Phát triển ứng dụng IoT', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL14204', name: 'Thực tập chuyên sâu', credit: 4, examFormat: 'Báo cáo' },
    ]},
    { semester: 'HK9', courses: [
      { code: 'CDT1434', name: 'Đồ án tốt nghiệp', credit: 6 },
      { code: 'MUL2019', name: 'Thực tập tốt nghiệp', credit: 6 },
    ]},
  ]);

  const designSemesters = mapSemesters([
    { semester: 'HK1', courses: [
      { code: 'BAS1105M', name: 'Giáo dục quốc phòng', credit: 3, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn / Thực hành' },
      { code: 'BAS1106', name: 'Giáo dục thể chất 1', credit: 2, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
      { code: 'BAS1150', name: 'Triết học Mác - Lênin', credit: 3, examFormat: 'Tiểu luận' },
      { code: 'BAS1219', name: 'Toán cao cấp 1', credit: 2, examFormat: 'Thi viết + Vấn đáp' },
      { code: 'INT1154', name: 'Tin học cơ sở 1', credit: 2, examFormat: 'Vấn đáp trực tuyến' },
      { code: 'MUL1238', name: 'Cơ sở tạo hình', credit: 3, examFormat: 'Bài tập lớn + Vấn đáp' },
      { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credit: 2, examFormat: 'Bài tập lớn + Vấn đáp' },
    ]},
    { semester: 'HK2', courses: [
      { code: 'BAS1107', name: 'Giáo dục thể chất 2', credit: 2, countInCredits: false, countInGpa: false, examFormat: 'Thực hành' },
      { code: 'BAS1151', name: 'Kinh tế chính trị Mác - Lênin', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'BAS1220', name: 'Toán cao cấp 2', credit: 2, examFormat: 'Tự luận' },
      { code: 'INT1155', name: 'Tin học cơ sở 2', credit: 2, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL13150', name: 'Thiết kế đồ họa', credit: 3, examFormat: 'Vấn đáp' },
    ]},
    { semester: 'HK3', courses: [
      { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'BAS1226', name: 'Xác suất thống kê', credit: 2, examFormat: 'Tự luận' },
      { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1358', name: 'Toán rời rạc 1', credit: 3, examFormat: 'Tự luận' },
      { code: 'MUL1314', name: 'Kỹ thuật quay phim', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL14134', name: 'Thiết kế hình động 1', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'SKD1102', name: 'Kỹ năng làm việc nhóm', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK4', courses: [
      { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credit: 2, examFormat: 'Tự luận' },
      { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credit: 4, examFormat: 'Vấn đáp' },
      { code: 'INT1306', name: 'Cấu trúc dữ liệu và giải thuật', credit: 3, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'INT1325', name: 'Kiến trúc máy tính và hệ điều hành', credit: 2, examFormat: 'Thực hành (Phòng máy)' },
      { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'SKD1103', name: 'Kỹ năng tạo lập Văn bản', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
    ]},

    { semester: 'HK5', courses: [
      { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản Việt Nam', credit: 2, examFormat: 'Trắc nghiệm' },
      { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL13124', name: 'Dựng audio và video phi tuyến', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL13152', name: 'Thiết kế web cơ bản', credit: 3, examFormat: 'Vấn đáp' },
      { code: 'MUL14143', name: 'Mỹ học', credit: 3 }, // chưa có trong ảnh -> để trống
      { code: 'MUL1415', name: 'Kỹ xảo đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
      { code: 'MUL1422', name: 'Tổ chức sản xuất sản phẩm đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
      { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credit: 2, examFormat: 'Vấn đáp' },
    ]},
    { semester: 'HK6', courses: [
      { code: 'MUL14131', name: 'Luật xa gần', credit: 3 }, // chưa có trong ảnh
      { code: 'MUL14132', name: 'Cơ sở tạo hình nâng cao', credit: 3 }, // chưa có
      { code: 'MUL14135', name: 'Thiết kế sản phẩm đa phương tiện', credit: 3 }, // chưa có
      { code: 'MUL14136', name: 'Nghệ thuật đồ họa chữ (Typography)', credit: 3 }, // chưa có
      { code: 'MUL14140', name: 'Thiết kế hình động 2', credit: 3 }, // chưa có
      { code: 'MUL14155', name: 'Thiết kế giao diện người dùng', credit: 3 }, // dùng chung với HK8
      { code: 'SKD1101', name: 'Kỹ năng thuyết trình', credit: 1, countInCredits: false, countInGpa: false, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK7', courses: [
      { code: 'MUL14127', name: 'Thiết kế Game', credit: 3 }, // chưa có
      { code: 'MUL14138', name: 'Thiết kế ấn phẩm điện tử 1', credit: 3 }, // chưa có
      { code: 'MUL14144', name: 'Kịch bản phân cảnh', credit: 3 }, // chưa có
      { code: 'MUL14145', name: 'Thiết kế hình động 3D', credit: 3 }, // chưa có
      { code: 'MUL14153', name: 'Thiết kế ứng dụng trên đầu cuối di động', credit: 3 }, // chưa có
    ]},
    { semester: 'HK8', courses: [
      { code: 'MUL13148', name: 'Bản quyền số', credit: 2, examFormat: 'Tự luận' },
      { code: 'MUL14139', name: 'Thiết kế sản phẩm điện tử 2', credit: 3 }, // chưa có
      { code: 'MUL14141', name: 'Đồ án thiết kế sản phẩm đa phương tiện', credit: 2 }, // chưa có
      { code: 'MUL14155', name: 'Thiết kế giao diện người dùng', credit: 3, examFormat: 'Thiết kế giao diện người dùng' },
      { code: 'MUL14204', name: 'Thực tập chuyên sâu', credit: 4, examFormat: 'Báo cáo' },
      { code: 'MUL1465', name: 'Chuyên đề thiết kế đa phương tiện', credit: 1 }, // chưa có
      { code: 'SKD1108', name: 'Phương pháp luận nghiên cứu khoa học', credit: 2, examFormat: 'Bài tập lớn' },
    ]},
    { semester: 'HK9', courses: [
      { code: 'CDT1434', name: 'Đồ án tốt nghiệp', credit: 6 },
      { code: 'MUL2019', name: 'Thực tập tốt nghiệp', credit: 6 },
    ]},
  ]);

  const results: any[] = [];
  const upsert = async (specialization: string, name: string, semesters: any[], requiredCredits = 150) => {
    const payload = { specialization, name, semesters, requiredCredits } as any;
    if (force) {
      const doc = await Curriculum.findOneAndUpdate({ specialization }, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
      results.push({ specialization, upserted: true, id: doc.id });
    } else {
      const exists = await Curriculum.findOne({ specialization });
      if (!exists) {
        const doc = await Curriculum.create(payload);
        results.push({ specialization, created: true, id: doc.id });
      } else {
        results.push({ specialization, skipped: true });
      }
    }
  };

  await upsert('dev', 'Phát triển ứng dụng ĐPT', devSemesters, 150);
  await upsert('design', 'Thiết kế ĐPT', designSemesters, 150);

  return res.json({ ok: true, results });
};


