import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined,
  CalendarOutlined,
  FilterOutlined,
  DownOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { getAuthUser } from '../services/auth';
import { fetchDeadlines as apiFetchDeadlines, createDeadline as apiCreateDeadline, updateDeadline as apiUpdateDeadline, deleteDeadline as apiDeleteDeadline } from '../services/deadlines';


type DeadlineFormValues = {
  title: string;
  startDate?: Dayjs;
  startTime?: Dayjs;
  endDate?: Dayjs;
  endTime?: Dayjs;
  note?: string;
};

type Deadline = {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  note: string;
  createdAt: string;
  status: 'upcoming' | 'ongoing' | 'overdue' | 'completed';
};



export default function DeadlinePage() {
  const location = useLocation();
  const [form] = Form.useForm<DeadlineFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'completed' | 'upcoming' | 'ongoing' | 'overdue'>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const hasOpenedFromUrl = useRef<string | null>(null); 

 
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const deadlineId = qs.get('id');
    const st = (qs.get('status') || '').toLowerCase();
    const allowed = new Set(['all','incomplete','completed','upcoming','ongoing','overdue']);
    
   
    if (deadlineId && statusFilter !== 'all') {
      setStatusFilter('all');
    } else if (st && allowed.has(st) && st !== statusFilter) {
      setStatusFilter(st as any);
    }
  }, [location.search]);

 
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    const statusParam = statusFilter === 'all' ? undefined : statusFilter;
    apiFetchDeadlines(u.id, statusParam as any)
      .then((rs) => {
        const mapped = rs
          
          .filter((d) => !d.isExam)
          .map((d) => ({
            id: d._id,
            title: d.title,
            startAt: d.startAt ?? null,
            endAt: d.endAt ?? null,
            note: d.note || '',
            createdAt: d.createdAt,
            status: d.status,
          } as Deadline));
        setDeadlines(mapped);
        setPage(1);
      })
      .catch(() => {});
  }, [statusFilter]);

 
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const deadlineId = qs.get('id');
    
   
    if (deadlineId && deadlines.length > 0 && !isModalVisible && hasOpenedFromUrl.current !== deadlineId) {
      const deadline = deadlines.find(d => d.id === deadlineId);
      if (deadline) {
        hasOpenedFromUrl.current = deadlineId;
        setEditingDeadline(deadline);
        form.setFieldsValue({
          title: deadline.title,
          startDate: deadline.startAt ? dayjs(deadline.startAt) : undefined,
          startTime: deadline.startAt ? dayjs(deadline.startAt) : undefined,
          endDate: deadline.endAt ? dayjs(deadline.endAt) : undefined,
          endTime: deadline.endAt ? dayjs(deadline.endAt) : undefined,
          note: deadline.note
        });
        setIsModalVisible(true);
       
        const newSearch = new URLSearchParams(location.search);
        newSearch.delete('id');
        window.history.replaceState({}, '', `${location.pathname}${newSearch.toString() ? '?' + newSearch.toString() : ''}`);
      }
    }
    
    
    if (!deadlineId && hasOpenedFromUrl.current) {
      hasOpenedFromUrl.current = null;
    }
  }, [location.search, deadlines, isModalVisible, form]);

 
  useEffect(() => {
    if (!isModalVisible) return;
    if (editingDeadline) {
      form.setFieldsValue({
        title: editingDeadline.title,
        startDate: editingDeadline.startAt ? dayjs(editingDeadline.startAt) : undefined,
        startTime: editingDeadline.startAt ? dayjs(editingDeadline.startAt) : undefined,
        endDate: editingDeadline.endAt ? dayjs(editingDeadline.endAt) : undefined,
        endTime: editingDeadline.endAt ? dayjs(editingDeadline.endAt) : undefined,
        note: editingDeadline.note
      });
    } else {
      form.resetFields();
    }
  }, [isModalVisible, editingDeadline, form]);

  const getDeadlineStatus = (startAt: string | null, endAt: string | null): Deadline['status'] => {
    const now = dayjs();
    const start = startAt ? dayjs(startAt) : null;
    const end = endAt ? dayjs(endAt) : null;
    if (end && now.isAfter(end)) return 'overdue';
    if (start && end && now.isAfter(start) && now.isBefore(end)) return 'ongoing';
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
      
      const u = getAuthUser();
      if (!u?.id) return;
      if (editingDeadline) {
        const updated = await apiUpdateDeadline(u.id, editingDeadline.id, {
          title: values.title,
          startAt: start?.toISOString() ?? null,
          endAt: end?.toISOString() ?? null,
          note: values.note ?? '',
        });
        setDeadlines(prev => prev.map(d => d.id === editingDeadline.id ? {
          id: updated._id,
          title: updated.title,
          startAt: updated.startAt ?? null,
          endAt: updated.endAt ?? null,
          note: updated.note || '',
          createdAt: updated.createdAt,
          status: updated.status,
        } : d));
      } else {
        const created = await apiCreateDeadline(u.id, {
          title: values.title,
          startAt: start?.toISOString() ?? null,
          endAt: end?.toISOString() ?? null,
          note: values.note ?? '',
        });
        setDeadlines(prev => [{
          id: created._id,
          title: created.title,
          startAt: created.startAt ?? null,
          endAt: created.endAt ?? null,
          note: created.note || '',
          createdAt: created.createdAt,
          status: created.status,
        }, ...prev]);
        setPage(1);
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
    setIsModalVisible(true);
    form.setFieldsValue({
      title: deadline.title,
      startDate: deadline.startAt ? dayjs(deadline.startAt) : undefined,
      startTime: deadline.startAt ? dayjs(deadline.startAt) : undefined,
      endDate: deadline.endAt ? dayjs(deadline.endAt) : undefined,
      endTime: deadline.endAt ? dayjs(deadline.endAt) : undefined,
      note: deadline.note,
    });
  };

  const handleDelete = async (id: string) => {
    const u = getAuthUser();
    if (!u?.id) return;
    await apiDeleteDeadline(u.id, id).catch(() => {});
    setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  const handleAddNew = () => {
    setEditingDeadline(null);
    setIsModalVisible(true);
    form.setFieldsValue({
      title: '',
      startDate: undefined,
      startTime: undefined,
      endDate: undefined,
      endTime: undefined,
      note: '',
    });
  };

  const handleCompletionChange = async (
    id: string,
    value: 'completed' | 'incomplete' | 'ongoing' | 'upcoming'
  ) => {
    const u = getAuthUser();
    if (!u?.id) return;
    const cur = deadlines.find((d) => d.id === id);
    if (!cur) return;

   
    const nextStatus =
      value === 'completed' ? 'completed' : value === 'ongoing' ? 'ongoing' : undefined;

    const updated = await apiUpdateDeadline(u.id, id, {
      status: nextStatus,
      
      startAt: cur.startAt,
      endAt: cur.endAt,
    }).catch(() => null);
    if (updated) {
      setDeadlines(prev => prev.map(d => d.id === id ? {
        id: updated._id,
        title: updated.title,
        startAt: updated.startAt ?? null,
        endAt: updated.endAt ?? null,
        note: updated.note || '',
        createdAt: updated.createdAt,
        status: updated.status,
      } : d));
    }
  };

  const applyFilters = (items: Deadline[]) => items; 

  const sequenceMap = useMemo(() => {
    const sorted = [...deadlines].sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
    const map: Record<string, number> = {};
    sorted.forEach((d, idx) => { map[d.id] = idx + 1; });
    return map;
  }, [deadlines]);

  const columns = [
    {
      title: (
        <div className="deadline-table-header">STT</div>
      ),
      key: 'index',
      width: 70,
      align: 'center' as const,
      render: (_: any, record: Deadline) => sequenceMap[record.id] ?? 0
    },
    {
      title: (
        <div className="deadline-table-header">
          Tiêu đề
        </div>
      ),
      dataIndex: 'title',
      key: 'title',
      width: 180,
      align: 'center' as const,
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
      width: 220,
      align: 'center' as const,
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
      width: 220,
      align: 'center' as const,
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
      key: 'status',
      width: 180,
      align: 'center' as const,
      render: (_: any, record: Deadline) => {
        
        let selectValue: 'completed' | 'incomplete' | 'ongoing' | 'upcoming';
        switch (record.status) {
          case 'completed':
            selectValue = 'completed';
            break;
          case 'ongoing':
            selectValue = 'ongoing';
            break;
          case 'upcoming':
            selectValue = 'upcoming';
            break;
          default:
           
            selectValue = 'incomplete';
        }

        return (
          <Select
            className="deadline-status-select"
            value={selectValue}
            style={{ width: 160, display: 'block', margin: '0 auto' }}
            onChange={(v: 'completed' | 'incomplete' | 'ongoing' | 'upcoming') =>
              handleCompletionChange(record.id, v)
            }
            options={[
              {
                value: 'upcoming',
                label: (
                  <span className="status-pill status-blue">
                    Sắp tới
                  </span>
                ),
              },
              {
                value: 'ongoing',
                label: (
                  <span className="status-pill status-blue">
                    Đang diễn ra
                  </span>
                ),
              },
              {
                value: 'completed',
                label: (
                  <span className="status-pill status-green">
                    Đã hoàn thành
                  </span>
                ),
              },
              {
                value: 'incomplete',
                label: (
                  <span className="status-pill status-yellow">
                    Không hoàn thành
                  </span>
                ),
              },
            ]}
          />
        );
      }
    },
    {
      title: (
        <div className="deadline-table-header">
          Thao tác
        </div>
      ),
      key: 'actions',
      width: 160,
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

  return (
    <div className="deadline-page-container">
      {/* Page title top-left */}
      <div style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0, color: '#2d3436' }}>Danh sách Deadline</Typography.Title>
      </div>
      {/* Stats Overview */}
      <div className="deadline-stats-overview">
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.length}</div>
          <div className="deadline-stats-label">Tổng Deadline</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status === 'ongoing').length}</div>
          <div className="deadline-stats-label">Đang diễn ra</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status === 'completed').length}</div>
          <div className="deadline-stats-label">Hoàn thành</div>
        </div>
        <div className="deadline-stats-card">
          <div className="deadline-stats-number">{deadlines.filter(d => d.status !== 'completed').length}</div>
          <div className="deadline-stats-label">Không hoàn thành</div>
        </div>
      </div>

      {}

      

      {}
      <div>
        <Card 
          title={
            <span className="filter-select-wrap">
              <FilterOutlined className="filter-select-icon" />
              <Select
                className="filter-select"
                value={statusFilter}
                style={{ width: 200 }}
                onChange={(v) => setStatusFilter(v)}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'incomplete', label: 'Không hoàn thành' },
                  { value: 'completed', label: 'Đã hoàn thành' },
                  { value: 'ongoing', label: 'Đang diễn ra' }
                ]}
              />
            </span>
          }
          extra={
            <Button 
              type="primary" 
              onClick={handleAddNew}
              size="middle"
              className="deadline-create-button"
              style={{ height: 36, paddingLeft: 16, paddingRight: 16 }}
            >
              Tạo Deadline Mới
            </Button>
          }
          className="deadline-card"
          styles={{
            header: {
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderBottom: '0',
              borderRadius: '20px 20px 0 0',
              padding: '24px 32px',
              margin: 0
            },
            body: {
              padding: '32px',
              background: 'transparent'
            }
          }}
        >
          <Table
            columns={columns}
            dataSource={useMemo(() => applyFilters(deadlines), [deadlines, statusFilter])}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: [5, 10, 20],
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              position: ['bottomRight']
            }}
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
         
          if (hasOpenedFromUrl.current) {
            hasOpenedFromUrl.current = null;
          }
        }}
        footer={null}
        width={650}
        style={{ top: 20 }}
        destroyOnHidden
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
                  // Reset the URL tracking when modal is closed manually
                  if (hasOpenedFromUrl.current) {
                    hasOpenedFromUrl.current = null;
                  }
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