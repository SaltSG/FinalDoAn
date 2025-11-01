import { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  DatePicker, 
  Form, 
  Input, 
  Select, 
  Space, 
  TimePicker, 
  Typography, 
  Table, 
  Tag, 
  Modal, 
  Row, 
  Col, 
  Alert,
  Popconfirm,
  Tooltip,
  Collapse
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';


type DeadlineFormValues = {
  subject: string;
  title: string;
  startDate?: Dayjs;
  startTime?: Dayjs;
  endDate?: Dayjs;
  endTime?: Dayjs;
  note?: string;
};

type Deadline = {
  id: string;
  subject: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  note: string;
  createdAt: string;
  status: 'upcoming' | 'ongoing' | 'overdue' | 'completed';
};

const SUBJECTS = [
  { value: 'mm101', label: 'MM101 - Nhập môn Multimedia' },
  { value: 'mm202', label: 'MM202 - Thiết kế đồ họa' },
  { value: 'mm303', label: 'MM303 - Biên tập video' }
];

export default function DeadlinePage() {
  const [form] = Form.useForm<DeadlineFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);

  // Load deadlines from localStorage on component mount
  useEffect(() => {
    console.log('Component mounted, loading from localStorage...');
    const savedDeadlines = localStorage.getItem('deadlines');
    if (savedDeadlines) {
      try {
        const parsed = JSON.parse(savedDeadlines);
        const deadlinesWithStatus = parsed.map((d: any) => ({
          ...d,
          status: getDeadlineStatus(d.endAt)
        }));
        setDeadlines(deadlinesWithStatus);
        console.log('Loaded deadlines from localStorage:', deadlinesWithStatus);
      } catch (error) {
        console.error('Error loading deadlines:', error);
      }
    } else {
      console.log('No saved deadlines found in localStorage');
    }
  }, []);

  // Save deadlines to localStorage whenever deadlines change (but not on initial load)
  useEffect(() => {
    if (deadlines.length > 0) {
    localStorage.setItem('deadlines', JSON.stringify(deadlines));
      console.log('Saved deadlines to localStorage:', deadlines);
    }
  }, [deadlines]);

  const getDeadlineStatus = (endAt: string | null): Deadline['status'] => {
    if (!endAt) return 'upcoming';
    const now = dayjs();
    const end = dayjs(endAt);
    const diffHours = end.diff(now, 'hours');
    
    if (diffHours < 0) return 'overdue';
    if (diffHours <= 24) return 'ongoing';
    return 'upcoming';
  };

  const getStatusColor = (status: Deadline['status']) => {
    switch (status) {
      case 'overdue': return 'red';
      case 'ongoing': return 'orange';
      case 'upcoming': return 'blue';
      case 'completed': return 'green';
      default: return 'default';
    }
  };

  const getStatusText = (status: Deadline['status']) => {
    switch (status) {
      case 'overdue': return 'Quá hạn';
      case 'ongoing': return 'Sắp hết hạn';
      case 'upcoming': return 'Sắp tới';
      case 'completed': return 'Hoàn thành';
      default: return 'Không xác định';
    }
  };

  const onSubmit = async (values: DeadlineFormValues) => {
    setSubmitting(true);
    try {
      const start = mergeDateTime(values.startDate, values.startTime);
      const end = mergeDateTime(values.endDate, values.endTime);
      
      const newDeadline: Deadline = {
        id: editingDeadline?.id || Date.now().toString(),
        subject: values.subject,
        title: values.title,
        startAt: start?.toISOString() ?? null,
        endAt: end?.toISOString() ?? null,
        note: values.note ?? '',
        createdAt: editingDeadline?.createdAt || new Date().toISOString(),
        status: getDeadlineStatus(end?.toISOString() ?? null)
      };

      if (editingDeadline) {
        setDeadlines(prev => {
          const updated = prev.map(d => d.id === editingDeadline.id ? newDeadline : d);
          // Manually save to localStorage
          localStorage.setItem('deadlines', JSON.stringify(updated));
          console.log('Updated deadline and saved to localStorage');
          return updated;
        });
      } else {
        setDeadlines(prev => {
          const updated = [...prev, newDeadline];
          // Manually save to localStorage
          localStorage.setItem('deadlines', JSON.stringify(updated));
          console.log('Added new deadline and saved to localStorage');
          return updated;
        });
      }

      form.resetFields();
      setIsModalVisible(false);
      setEditingDeadline(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    form.setFieldsValue({
      subject: deadline.subject,
      title: deadline.title,
      startDate: deadline.startAt ? dayjs(deadline.startAt) : undefined,
      startTime: deadline.startAt ? dayjs(deadline.startAt) : undefined,
      endDate: deadline.endAt ? dayjs(deadline.endAt) : undefined,
      endTime: deadline.endAt ? dayjs(deadline.endAt) : undefined,
      note: deadline.note
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    setDeadlines(prev => {
      const updated = prev.filter(d => d.id !== id);
      // Manually save to localStorage
      localStorage.setItem('deadlines', JSON.stringify(updated));
      console.log('Deleted deadline and saved to localStorage');
      return updated;
    });
  };

  const handleAddNew = () => {
    setEditingDeadline(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: (
        <div className="deadline-table-header">
          Môn học
        </div>
      ),
      dataIndex: 'subject',
      key: 'subject',
      width: 220,
      render: (subject: string) => {
        const subjectInfo = SUBJECTS.find(s => s.value === subject);
        return (
          <div className="deadline-subject-cell">
            {subjectInfo?.label || subject}
          </div>
        );
      }
    },
    {
      title: (
        <div className="deadline-table-header">
          Tiêu đề
        </div>
      ),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <div className="deadline-title-cell">
          {title}
        </div>
      )
    },
    {
      title: (
        <div className="deadline-table-header">
          Thời gian bắt đầu
        </div>
      ),
      dataIndex: 'startAt',
      key: 'startAt',
      width: 160,
      render: (startAt: string | null) => (
        <div className={`deadline-time-cell ${startAt ? 'has-time' : ''}`}>
          {startAt ? dayjs(startAt).format('DD/MM/YYYY HH:mm') : 'Chưa có'}
        </div>
      )
    },
    {
      title: (
        <div className="deadline-table-header">
          Thời gian kết thúc
        </div>
      ),
      dataIndex: 'endAt',
      key: 'endAt',
      width: 160,
      render: (endAt: string | null) => (
        <div className={`deadline-time-cell deadline-end-time-cell ${endAt ? 'has-time' : ''}`}>
          {endAt ? dayjs(endAt).format('DD/MM/YYYY HH:mm') : 'Chưa có'}
        </div>
      )
    },
    {
      title: (
        <div className="deadline-table-header">
          Trạng thái
        </div>
      ),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (status: Deadline['status']) => (
        <Tag 
          color={getStatusColor(status)} 
          className="deadline-status-tag"
        >
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: (
        <div className="deadline-table-header">
          Thao tác
        </div>
      ),
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: Deadline) => (
        <Space>
          <Tooltip title="Chỉnh sửa deadline">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
              className="deadline-edit-button"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa deadline"
            description="Bạn có chắc chắn muốn xóa deadline này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa deadline">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                className="deadline-delete-button"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Get upcoming deadlines for alert
  const upcomingDeadlines = deadlines.filter(d => d.status === 'ongoing' || d.status === 'overdue');

  return (
    <div className="deadline-page-container">
      {/* Stats Overview */}
      <div className="deadline-stats-overview">
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.length}</div>
          <div className="deadline-stats-label">Tổng Deadline</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status === 'ongoing').length}</div>
          <div className="deadline-stats-label">Sắp hết hạn</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status === 'overdue').length}</div>
          <div className="deadline-stats-label">Quá hạn</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status === 'upcoming').length}</div>
          <div className="deadline-stats-label">Sắp tới</div>
        </div>
      </div>

      {/* Alert for upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="deadline-alert">
          <div className="deadline-alert-circle" />
          <div className="deadline-alert-content">
            <div className="deadline-alert-title">
              <ExclamationCircleOutlined style={{ marginRight: '8px', fontSize: '20px' }} />
              ⚠️ Nhắc nhở Deadline
            </div>
            <div className="deadline-alert-description">
              Bạn có <strong className="deadline-alert-count">{upcomingDeadlines.length}</strong> deadline sắp hết hạn hoặc quá hạn:
            </div>
            <div className="deadline-alert-list">
              {upcomingDeadlines.slice(0, 3).map(deadline => (
                <div key={deadline.id} className="deadline-alert-item">
                  <div>
                    <strong className="deadline-alert-item-title">{deadline.title}</strong>
                    <div className="deadline-alert-item-time">
                      {dayjs(deadline.endAt).format('DD/MM/YYYY HH:mm')}
                    </div>
                  </div>
                  <Tag 
                    color={getStatusColor(deadline.status)} 
                    style={{ 
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '4px 12px'
                    }}
                  >
                    {getStatusText(deadline.status)}
                  </Tag>
                </div>
              ))}
              {upcomingDeadlines.length > 3 && (
                <div className="deadline-alert-more">
                  ... và {upcomingDeadlines.length - 3} deadline khác
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Deadline Button */}
      <div className="deadline-action-container">
        <Button 
          type="primary" 
          onClick={handleAddNew}
          size="large"
          className="deadline-create-button"
        >
          Tạo Deadline Mới
        </Button>
      </div>

      {/* Deadline Table */}
      <div>
        <Card 
          title={
            <div className="deadline-card-title">
              <div className="deadline-card-icon">
                <ClockCircleOutlined />
              </div>
              Danh sách Deadline 
              <Tag 
                color="blue" 
                className="deadline-count-tag"
              >
                {deadlines.length} deadline
              </Tag>
            </div>
          }
          className="deadline-card"
          headStyle={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
            borderBottom: '3px solid #667eea',
            borderRadius: '20px 20px 0 0',
            padding: '24px 32px',
            margin: 0
          }}
          bodyStyle={{ 
            padding: '32px',
            background: 'transparent'
          }}
        >
          <Table
            columns={columns}
            dataSource={deadlines}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
            size="middle"
            bordered={false}
            className="deadline-table"
            rowClassName={(record: Deadline) => {
              switch (record.status) {
                case 'overdue': return 'deadline-row-overdue';
                case 'ongoing': return 'deadline-row-ongoing';
                default: return 'deadline-row-normal';
              }
            }}
            locale={{
              emptyText: (
                <div className="deadline-empty-state">
                  <div className="deadline-empty-icon">
                    <ClockCircleOutlined />
                  </div>
                  <div className="deadline-empty-title">
                    Chưa có deadline nào
                  </div>
                  <div className="deadline-empty-description">
                    Hãy tạo deadline đầu tiên để bắt đầu quản lý!
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleAddNew}
                    className="deadline-empty-button"
                  >
                    Tạo Deadline Đầu Tiên
                  </Button>
                </div>
              )
            }}
          />
        </Card>
      </div>

      {/* Modal for creating/editing deadline */}
      <Modal
        title={
          <div className="deadline-modal-title">
            <div className="deadline-modal-icon">
              <CalendarOutlined />
            </div>
            {editingDeadline ? '✏️ Chỉnh sửa Deadline' : '✨ Tạo Deadline Mới'}
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingDeadline(null);
          form.resetFields();
        }}
        footer={null}
        width={650}
        style={{ top: 20 }}
        destroyOnClose
        styles={{
          header: {
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '3px solid #667eea',
            borderRadius: '12px 12px 0 0'
          },
          body: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            padding: '32px'
          }
        }}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} size="middle">
          <Form.Item name="subject" label="Môn học" rules={[{ required: true, message: 'Chọn môn học' }]}>
            <Select placeholder="Chọn môn" options={SUBJECTS} showSearch allowClear />
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="Ví dụ: Bài tập chương 2" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Ngày bắt đầu">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startTime" label="Giờ bắt đầu">
                <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Giờ kết thúc">
                <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Yêu cầu nộp bài, link tham khảo..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingDeadline(null);
                  form.resetFields();
                }}
                className="deadline-modal-cancel-button"
              >
                ❌ Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting} 
                icon={<PlusOutlined />}
                className="deadline-modal-submit-button"
              >
                {editingDeadline ? '💾 Cập nhật' : '✨ Tạo Deadline'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function mergeDateTime(date?: Dayjs, time?: Dayjs) {
  if (!date && !time) return undefined;
  const d = date ?? dayjs();
  const t = time ?? dayjs().startOf('day');
  return d.hour(t.hour()).minute(t.minute()).second(0).millisecond(0);
}