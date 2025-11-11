import { Card, Table, Button, Space, Tag, Input, Select, Modal, Form, message, Popconfirm, Typography, Avatar } from 'antd';
import { useEffect, useState } from 'react';
import { EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { listUsers, updateUser, deleteUser, type User } from '../../services/admin';

const { Title } = Typography;
const { Option } = Select;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadUsers = async (page = 1, searchText = search, role = roleFilter) => {
    setLoading(true);
    try {
      const result = await listUsers({
        page,
        limit: pagination.limit,
        search: searchText || undefined,
        role: role as 'user' | 'admin' | undefined,
      });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (error: any) {
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = () => {
    loadUsers(1, search, roleFilter);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (!editingUser) return;
      await updateUser(editingUser._id, values);
      message.success('Cập nhật thành công');
      setEditModalVisible(false);
      setEditingUser(null);
      loadUsers(pagination.page, search, roleFilter);
    } catch (error: any) {
      message.error('Cập nhật thất bại: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      message.success('Xóa thành công');
      loadUsers(pagination.page, search, roleFilter);
    } catch (error: any) {
      message.error('Xóa thất bại: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar src={record.picture} icon={<UserOutlined />}>
            {(record.name?.[0] || record.email?.[0] || 'U').toUpperCase()}
          </Avatar>
          <div>
            <div>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>{role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</Tag>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => (
        <Tag color={provider === 'google' ? 'green' : 'default'}>
          {provider === 'google' ? 'Google' : 'Local'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa người dùng này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="container" style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px', color: 'var(--color-secondary)' }}>
        Quản lý người dùng
      </Title>

      <Card>
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input
              placeholder="Tìm kiếm theo tên hoặc email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: '300px' }}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Lọc theo vai trò"
              value={roleFilter || undefined}
              onChange={setRoleFilter}
              style={{ width: '200px' }}
              allowClear
            >
              <Option value="user">Người dùng</Option>
              <Option value="admin">Quản trị viên</Option>
            </Select>
            <Button type="primary" onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="_id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} người dùng`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, page, limit: pageSize || 20 });
              loadUsers(page, search, roleFilter);
            },
          }}
        />
      </Card>

      <Modal
        title="Chỉnh sửa người dùng"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select>
              <Option value="user">Người dùng</Option>
              <Option value="admin">Quản trị viên</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

