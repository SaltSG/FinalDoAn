import { useEffect, useState } from 'react';
import { Layout, Menu, Typography, Table, Tag, Select, Switch, message, Card, Form, Input, Button, Space } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  CrownOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AdminUser, adminLogin, fetchUsers, setToken, updateUser } from './services/api';

const { Header, Sider, Content } = Layout;

type ViewState = 'login' | 'users';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<ViewState>('login');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; email: string; name: string; role?: string } | null>(
    null
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (err: any) {
      if (err?.message === 'UNAUTHORIZED' || err?.message === 'FORBIDDEN') {
        message.error('Phiên đăng nhập hết hạn hoặc không có quyền');
        setView('login');
        setToken(null);
      } else {
        message.error(err?.message || 'Không tải được danh sách người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'users') {
      loadUsers().catch(() => undefined);
    }
  }, [view]);

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'provider',
      key: 'provider',
      render: (v) => <Tag color={v === 'google' ? 'green' : 'blue'}>{v}</Tag>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => (
        <Select
          size="small"
          value={role ?? 'user'}
          style={{ width: 110 }}
          onChange={async (value) => {
            try {
              const updated = await updateUser(record.id, { role: value as any });
              setUsers((prev) => prev.map((u) => (u.id === record.id ? updated : u)));
              message.success('Cập nhật vai trò thành công');
            } catch (err: any) {
              message.error(err?.message || 'Lỗi khi cập nhật vai trò');
            }
          }}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space>
          <Switch
            checked={status !== 'locked'}
            checkedChildren="Hoạt động"
            unCheckedChildren="Khóa"
            onChange={async (checked) => {
              try {
                const updated = await updateUser(record.id, { status: checked ? 'active' : 'locked' });
                setUsers((prev) => prev.map((u) => (u.id === record.id ? updated : u)));
                message.success('Cập nhật trạng thái thành công');
              } catch (err: any) {
                message.error(err?.message || 'Lỗi khi cập nhật trạng thái');
              }
            }}
          />
          {status === 'locked' ? <LockOutlined style={{ color: '#f5222d' }} /> : <UnlockOutlined />}
        </Space>
      ),
    },
  ];

  const handleLogout = () => {
    setToken(null);
    setCurrentAdmin(null);
    setUsers([]);
    setView('login');
  };

  return (
    <Layout className="admin-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={230}>
        <div style={{ padding: 16, textAlign: 'center', fontWeight: 700, color: '#f97316' }}>
          {collapsed ? 'AD' : 'Study Tracker Admin'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[view]}
          items={[
            {
              key: 'users',
              icon: <UserOutlined />,
              label: 'Quản lý người dùng',
            },
          ]}
          onClick={(e) => {
            if (e.key === 'users') setView('users');
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 24,
          }}
        >
          <Space align="center">
            <CrownOutlined style={{ color: '#facc15', fontSize: 20 }} />
            <Typography.Text className="admin-header-title">Bảng điều khiển Admin</Typography.Text>
          </Space>
          {currentAdmin && (
            <Space>
              <Typography.Text style={{ color: '#e5e7eb' }}>
                {currentAdmin.name} ({currentAdmin.email})
              </Typography.Text>
              <Button size="small" icon={<LogoutOutlined />} onClick={handleLogout}>
                Đăng xuất
              </Button>
            </Space>
          )}
        </Header>
        <Content className="admin-content">
          {view === 'login' ? (
            <Card style={{ maxWidth: 420, margin: '40px auto' }} title="Đăng nhập Admin">
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Dùng tài khoản có quyền <b>admin</b> để truy cập bảng điều khiển.
              </Typography.Paragraph>
              <Form
                layout="vertical"
                onFinish={async (values: any) => {
                  try {
                    setLoading(true);
                    const admin = await adminLogin(values.email, values.password);
                    if (admin.role !== 'admin') {
                      message.error('Tài khoản này không có quyền admin');
                      setToken(null);
                      return;
                    }
                    setCurrentAdmin(admin);
                    setView('users');
                    message.success('Đăng nhập thành công');
                  } catch (err: any) {
                    message.error(err?.message || 'Đăng nhập thất bại');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, message: 'Nhập email' }]}
                >
                  <Input type="email" placeholder="your-email@example.com" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[{ required: true, message: 'Nhập mật khẩu' }]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    icon={<CrownOutlined />}
                  >
                    Đăng nhập Admin
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          ) : (
            <Card title="Danh sách người dùng">
              <Table
                rowKey="id"
                loading={loading}
                dataSource={users}
                columns={columns}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}


