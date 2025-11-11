import { Card, Table, Button, Space, Tag, Select, Modal, Form, Input, InputNumber, message, Typography, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import { fetchCurriculum } from '../../services/curriculum';
import type { ProgressData, SemesterData } from '../../types/progress';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

type Course = {
  code: string;
  name: string;
  credit: number;
  countInGpa?: boolean;
  countInCredits?: boolean;
};

export default function AdminCurriculumPage() {
  const [specialization, setSpecialization] = useState<'dev' | 'design'>('dev');
  const [curriculum, setCurriculum] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ semester: string; course?: Course } | null>(null);
  const [form] = Form.useForm();

  const loadCurriculum = async (spec: 'dev' | 'design') => {
    setLoading(true);
    try {
      const data = await fetchCurriculum(spec);
      setCurriculum(data);
      if (data.semesters.length > 0 && !selectedSemester) {
        setSelectedSemester(data.semesters[0].semester);
      }
    } catch (error: any) {
      message.error('Không thể tải chương trình học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum(specialization);
  }, [specialization]);

  const handleAddCourse = () => {
    if (!selectedSemester) {
      message.warning('Vui lòng chọn học kỳ');
      return;
    }
    setEditingCourse({ semester: selectedSemester });
    form.resetFields();
    form.setFieldsValue({
      semester: selectedSemester,
      countInGpa: true,
      countInCredits: true,
    });
    setCourseModalVisible(true);
  };

  const handleEditCourse = (semester: string, course: Course) => {
    setEditingCourse({ semester, course });
    form.setFieldsValue({
      semester,
      code: course.code,
      name: course.name,
      credit: course.credit,
      countInGpa: course.countInGpa !== false,
      countInCredits: course.countInCredits !== false,
    });
    setCourseModalVisible(true);
  };

  const handleSaveCourse = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('auth.token');
      
      const url = `/api/admin/curriculum/${specialization}/course`;
      const method = editingCourse?.course ? 'PUT' : 'POST';
      
      const body: any = {
        ...values,
        countInGpa: values.countInGpa !== false,
        countInCredits: values.countInCredits !== false,
      };
      
      // For update, we need to include the code
      if (editingCourse?.course) {
        body.code = editingCourse.course.code;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lỗi không xác định');
      }

      message.success(editingCourse?.course ? 'Cập nhật môn học thành công' : 'Thêm môn học thành công');
      setCourseModalVisible(false);
      setEditingCourse(null);
      loadCurriculum(specialization);
    } catch (error: any) {
      message.error('Lỗi: ' + (error.message || 'Không thể lưu môn học'));
    }
  };

  const handleDeleteCourse = async (code: string) => {
    try {
      const token = localStorage.getItem('auth.token');
      const response = await fetch(`/api/admin/curriculum/${specialization}/course?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lỗi không xác định');
      }

      message.success('Xóa môn học thành công');
      loadCurriculum(specialization);
    } catch (error: any) {
      message.error('Lỗi: ' + (error.message || 'Không thể xóa môn học'));
    }
  };

  const handleSeed = async () => {
    try {
      const token = localStorage.getItem('auth.token');
      const response = await fetch('/api/admin/curriculum/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ force: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lỗi không xác định');
      }

      message.success('Seed chương trình học thành công');
      loadCurriculum(specialization);
    } catch (error: any) {
      message.error('Lỗi: ' + (error.message || 'Không thể seed chương trình học'));
    }
  };

  const selectedSemesterData = curriculum?.semesters.find((s) => s.semester === selectedSemester);

  return (
    <div className="container" style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px', color: 'var(--color-secondary)' }}>
        Quản lý chương trình học
      </Title>

      <Card>
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Select
              value={specialization}
              onChange={setSpecialization}
              style={{ width: '250px' }}
            >
              <Option value="dev">Phát triển ứng dụng ĐPT</Option>
              <Option value="design">Thiết kế ĐPT</Option>
            </Select>
            {curriculum && (
              <Select
                value={selectedSemester}
                onChange={setSelectedSemester}
                style={{ width: '200px' }}
                placeholder="Chọn học kỳ"
              >
                {curriculum.semesters.map((sem) => (
                  <Option key={sem.semester} value={sem.semester}>
                    {sem.semester}
                  </Option>
                ))}
              </Select>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCourse}>
              Thêm môn học
            </Button>
            <Button onClick={handleSeed}>Seed dữ liệu</Button>
          </Space>
        </Space>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
        ) : selectedSemesterData ? (
          <Table
            dataSource={selectedSemesterData.courses}
            rowKey="code"
            columns={[
              {
                title: 'Mã môn',
                dataIndex: 'code',
                key: 'code',
              },
              {
                title: 'Tên môn học',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Tín chỉ',
                dataIndex: 'credit',
                key: 'credit',
              },
              {
                title: 'Tính vào GPA',
                key: 'countInGpa',
                render: (record: Course) => (
                  <Tag color={record.countInGpa !== false ? 'green' : 'red'}>
                    {record.countInGpa !== false ? 'Có' : 'Không'}
                  </Tag>
                ),
              },
              {
                title: 'Tính vào tín chỉ',
                key: 'countInCredits',
                render: (record: Course) => (
                  <Tag color={record.countInCredits !== false ? 'green' : 'red'}>
                    {record.countInCredits !== false ? 'Có' : 'Không'}
                  </Tag>
                ),
              },
              {
                title: 'Thao tác',
                key: 'actions',
                render: (record: Course) => (
                  <Space>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => handleEditCourse(selectedSemester, record)}
                    >
                      Sửa
                    </Button>
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteCourse(record.code)}
                    >
                      Xóa
                    </Button>
                  </Space>
                ),
              },
            ]}
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Chưa có dữ liệu. Vui lòng seed dữ liệu hoặc thêm môn học.
          </div>
        )}
      </Card>

      <Modal
        title={editingCourse?.course ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
        open={courseModalVisible}
        onOk={handleSaveCourse}
        onCancel={() => {
          setCourseModalVisible(false);
          setEditingCourse(null);
          form.resetFields();
        }}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="semester"
            label="Học kỳ"
            rules={[{ required: true, message: 'Vui lòng chọn học kỳ' }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="code"
            label="Mã môn"
            rules={[{ required: true, message: 'Vui lòng nhập mã môn' }]}
          >
            <Input placeholder="VD: INT1154" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên môn học"
            rules={[{ required: true, message: 'Vui lòng nhập tên môn học' }]}
          >
            <Input placeholder="VD: Tin học cơ sở 1" />
          </Form.Item>
          <Form.Item
            name="credit"
            label="Số tín chỉ"
            rules={[{ required: true, message: 'Vui lòng nhập số tín chỉ' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="countInGpa"
            label="Tính vào GPA"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="countInCredits"
            label="Tính vào tín chỉ"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

