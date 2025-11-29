import { useEffect, useState } from 'react';
import { Card, Typography, Segmented, Table, Tag, Select, Space, message, Spin, Button, Modal, Form, Input, InputNumber, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { CurriculumCourse, CurriculumDoc } from '../services/curriculum';
import { fetchCurriculumDoc, updateCourseInCurriculum, addCourseToCurriculum, deleteCourseInCurriculum } from '../services/curriculum';

type Spec = 'dev' | 'design';

type CourseRow = CurriculumCourse & { semester: string };

const CATEGORY_OPTIONS = [
  { value: 'common', label: 'Bắt buộc chung', color: '#60a5fa' },
  { value: 'group-common', label: 'Bắt buộc chung nhóm ngành', color: '#38bdf8' },
  { value: 'foundation', label: 'Cơ sở ngành', color: '#ef4444' },
  { value: 'major', label: 'Bắt buộc ngành', color: '#f97316' },
  { value: 'specialization', label: 'Chuyên ngành', color: '#a855f7' },
  { value: 'professional', label: 'Giáo dục chuyên nghiệp', color: '#6366f1' },
  { value: 'internship', label: 'Thực tập', color: '#1d4ed8' },
  { value: 'thesis', label: 'Luận văn tốt nghiệp', color: '#16a34a' },
  { value: 'elective', label: 'Tự chọn', color: '#9ca3af' },
];

const DEFAULT_CAT = { value: 'none', label: 'Chưa phân loại', color: '#e5e7eb' };

function inferCategory(course: CourseRow, spec: Spec): string | undefined {
  const code = (course.code || '').toUpperCase();
  const name = (course.name || '').toLowerCase();

  // Thực tập / thực tập tốt nghiệp
  if (name.includes('thực tập')) return 'internship';
  // Đồ án / luận văn tốt nghiệp
  if (name.includes('đồ án tốt nghiệp') || name.includes('luận văn') || code.startsWith('CDT')) {
    return 'thesis';
  }

  // Kỹ năng mềm, GDQP, GDTC, Mác-Lênin, tiếng Anh ... => Bắt buộc chung
  if (
    code.startsWith('BAS11') ||
    code.startsWith('SKD') ||
    name.includes('giáo dục') ||
    name.includes('kỹ năng') ||
    name.includes('mác') ||
    name.includes('lênin') ||
    name.includes('đảng cộng sản') ||
    name.includes('hồ chí minh') ||
    name.includes('tiếng anh')
  ) {
    return 'common';
  }

  // Các môn toán / xác suất / cơ sở tin học / cấu trúc dữ liệu... => Cơ sở ngành
  if (
    code.startsWith('BAS12') ||
    code.startsWith('INT11') ||
    code.startsWith('INT13') ||
    name.includes('toán') ||
    name.includes('xác suất') ||
    name.includes('tin học cơ sở') ||
    name.includes('cấu trúc dữ liệu') ||
    name.includes('kiến trúc máy tính')
  ) {
    return 'foundation';
  }

  // Các môn mỹ thuật / nhiếp ảnh / tạo hình / đồ họa cơ bản... => Cơ sở ngành
  if (
    name.includes('cơ sở tạo hình') ||
    name.includes('nhập môn đa phương tiện') ||
    name.includes('kỹ thuật nhiếp ảnh') ||
    name.includes('mỹ thuật cơ bản') ||
    name.includes('thiết kế hình động 1')
  ) {
    return 'foundation';
  }

  // Môn chuyên ngành / bắt buộc ngành (xử lý ảnh, game, web, audio, video, AR/VR, IoT,...)
  if (
    name.includes('xử lý ảnh') ||
    name.includes('dựng audio') ||
    name.includes('lập trình web') ||
    name.includes('game') ||
    name.includes('đa phương tiện') ||
    name.includes('ứng dụng') ||
    name.includes('thực tại ảo') ||
    name.includes('iot') ||
    name.includes('thị giác máy tính') ||
    code.startsWith('MUL14') ||
    code.startsWith('ELE14') ||
    code.startsWith('INT14')
  ) {
    return 'major';
  }

  // Mặc định: chưa phân loại
  return undefined;
}

function getCategoryMeta(course: CourseRow, spec: Spec) {
  const value = course.category || inferCategory(course, spec);
  if (!value) return DEFAULT_CAT;
  return CATEGORY_OPTIONS.find((c) => c.value === value) ?? DEFAULT_CAT;
}

export default function AdminCurriculumPage() {
  const [spec, setSpec] = useState<Spec>('dev');
  const [doc, setDoc] = useState<CurriculumDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [currentSemester, setCurrentSemester] = useState<string>('');
  const [form] = Form.useForm();

  const load = async (s: Spec) => {
    setLoading(true);
    try {
      const rs = await fetchCurriculumDoc(s);
      setDoc(rs);
    } catch (err: any) {
      message.error(err?.message || 'Không tải được chương trình học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(spec).catch(() => undefined);
  }, [spec]);

  const handleChangeCategory = async (course: CourseRow, value: string) => {
    setUpdatingCode(course.code);
    try {
      const cat = value === 'none' ? undefined : value;
      await updateCourseInCurriculum(spec, { code: course.code, category: cat });
      setDoc((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          semesters: prev.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.map((c) =>
              c.code === course.code ? { ...c, category: cat } : c
            ),
          })),
        };
      });
      message.success('Cập nhật loại môn thành công');
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi cập nhật loại môn');
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleAddCourse = (semester: string) => {
    setCurrentSemester(semester);
    setEditingCourse(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditCourse = (course: CourseRow) => {
    setEditingCourse(course);
    setCurrentSemester(course.semester);
    form.setFieldsValue({
      code: course.code,
      name: course.name,
      credit: course.credit,
      countInGpa: course.countInGpa !== false,
      countInCredits: course.countInCredits !== false,
      category: course.category || 'none',
    });
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (code: string) => {
    try {
      await deleteCourseInCurriculum(spec, code);
      setDoc((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          semesters: prev.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.filter((c) => c.code !== code),
          })),
        };
      });
      message.success('Xóa môn học thành công');
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi xóa môn học');
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCourse) {
        // Sửa môn học
        await updateCourseInCurriculum(spec, {
          code: editingCourse.code,
          name: values.name,
          credit: values.credit,
          countInGpa: values.countInGpa,
          countInCredits: values.countInCredits,
          category: values.category === 'none' ? undefined : values.category,
        });
        setDoc((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            semesters: prev.semesters.map((sem) => ({
              ...sem,
              courses: sem.courses.map((c) =>
                c.code === editingCourse.code
                  ? {
                      ...c,
                      name: values.name,
                      credit: values.credit,
                      countInGpa: values.countInGpa,
                      countInCredits: values.countInCredits,
                      category: values.category === 'none' ? undefined : values.category,
                    }
                  : c
              ),
            })),
          };
        });
        message.success('Cập nhật môn học thành công');
      } else {
        // Thêm môn học mới
        await addCourseToCurriculum(spec, currentSemester, {
          code: values.code,
          name: values.name,
          credit: values.credit,
          countInGpa: values.countInGpa,
          countInCredits: values.countInCredits,
          category: values.category === 'none' ? undefined : values.category,
        });
        await load(spec);
        message.success('Thêm môn học thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingCourse(null);
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      message.error(err?.message || 'Lỗi khi lưu môn học');
    }
  };

  const columns: ColumnsType<CourseRow> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 90 },
    { title: 'Tên môn', dataIndex: 'name', key: 'name' },
    { title: 'TC', dataIndex: 'credit', key: 'credit', width: 60 },
    {
      title: 'Loại môn',
      dataIndex: 'category',
      key: 'category',
      render: (_val, record) => {
        const meta = getCategoryMeta(record, spec);
        return (
          <Space size={8}>
            <Tag color={meta.color} style={{ fontWeight: 600 }}>
              {meta.label}
            </Tag>
            <Select
              size="small"
              value={record.category || 'none'}
              style={{ width: 180 }}
              options={[DEFAULT_CAT, ...CATEGORY_OPTIONS]}
              onChange={(v) => handleChangeCategory(record, v)}
              loading={updatingCode === record.code}
            />
          </Space>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 120,
      render: (_val, record) => (
        <Space size={8}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCourse(record)}
          />
          <Popconfirm
            title="Xóa môn học"
            description={`Bạn có chắc muốn xóa "${record.name}"?`}
            onConfirm={() => handleDeleteCourse(record.code)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!doc && loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-header">
          <Typography.Title level={4} style={{ margin: 0, color: '#2d3436' }}>
            Quản lý chương trình học
          </Typography.Title>
        </div>
        <Spin />
      </div>
    );
  }

  const semesters = (doc?.semesters ?? []).map((sem) => ({
    ...sem,
    courses: sem.courses.filter((c) => c.code !== 'BAS1105M'),
  }));

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <Typography.Title level={4} style={{ margin: 0, color: '#2d3436' }}>
          Quản lý chương trình học
        </Typography.Title>
        <div style={{ marginTop: 8 }}>
          <Segmented
            options={[
              { label: 'Phát triển ứng dụng ĐPT', value: 'dev' },
              { label: 'Thiết kế ĐPT', value: 'design' },
            ]}
            value={spec}
            onChange={(v) => setSpec(v as Spec)}
          />
        </div>
      </div>

      <div className="admin-curriculum-legend">
        <div className="admin-curriculum-legend-item">
          <span
            className="admin-curriculum-legend-color"
            style={{ background: DEFAULT_CAT.color }}
          />
          <span>{DEFAULT_CAT.label}</span>
        </div>
        {CATEGORY_OPTIONS.map((opt) => (
          <div key={opt.value} className="admin-curriculum-legend-item">
            <span
              className="admin-curriculum-legend-color"
              style={{ background: opt.color }}
            />
            <span>{opt.label}</span>
          </div>
        ))}
      </div>

      {loading && <Spin />}

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {semesters.map((sem) => (
          <Card
            key={sem.semester}
            title={
              <Typography.Text strong>
                {sem.semester}
              </Typography.Text>
            }
            size="small"
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddCourse(sem.semester)}
              >
                Thêm môn học
              </Button>
            }
          >
            <Table<CourseRow>
              size="small"
              rowKey="code"
              pagination={false}
              columns={columns}
              dataSource={sem.courses.map((c) => ({ ...c, semester: sem.semester }))}
            />
          </Card>
        ))}
      </Space>

      <Modal
        title={editingCourse ? 'Sửa môn học' : 'Thêm môn học'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingCourse(null);
        }}
        onOk={handleModalSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            countInGpa: true,
            countInCredits: true,
            category: 'none',
          }}
        >
          <Form.Item
            label="Mã môn học"
            name="code"
            rules={[{ required: true, message: 'Nhập mã môn học' }]}
          >
            <Input placeholder="Ví dụ: INT1306" disabled={!!editingCourse} />
          </Form.Item>
          <Form.Item
            label="Tên môn học"
            name="name"
            rules={[{ required: true, message: 'Nhập tên môn học' }]}
          >
            <Input placeholder="Ví dụ: Cấu trúc dữ liệu và giải thuật" />
          </Form.Item>
          <Form.Item
            label="Số tín chỉ"
            name="credit"
            rules={[{ required: true, message: 'Nhập số tín chỉ' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Tính vào GPA"
            name="countInGpa"
          >
            <Select
              options={[
                { value: true, label: 'Có' },
                { value: false, label: 'Không' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Tính vào tín chỉ"
            name="countInCredits"
          >
            <Select
              options={[
                { value: true, label: 'Có' },
                { value: false, label: 'Không' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Loại môn"
            name="category"
          >
            <Select
              options={[DEFAULT_CAT, ...CATEGORY_OPTIONS]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


