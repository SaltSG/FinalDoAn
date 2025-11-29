import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Select, Space, Typography, message, Input, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LockOutlined, UnlockOutlined, ReloadOutlined } from '@ant-design/icons';
import { AdminUser, fetchAdminUsers, updateAdminUser } from '../services/admin';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
    } catch (err: any) {
      message.error(err?.message || 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && (u.role ?? 'user') !== roleFilter) return false;
      if (statusFilter !== 'all' && (u.status ?? 'active') !== statusFilter) return false;
      if (!term) return true;
      const hay = `${u.name ?? ''} ${u.email ?? ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [users, search, roleFilter, statusFilter]);

  const columns: ColumnsType<AdminUser> = [
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (v) => (
        <Tag color={v === 'google' ? 'green' : 'blue'} style={{ textTransform: 'uppercase', fontWeight: 600 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => (
        <Space size={8}>
          <Tag
            color={role === 'admin' ? 'gold' : 'default'}
            style={{ fontWeight: 700, minWidth: 64, textAlign: 'center' }}
          >
            {role === 'admin' ? 'Admin' : 'User'}
          </Tag>
          <Select
            size="small"
            value={role ?? 'user'}
            style={{ width: 110 }}
            onChange={async (value) => {
              try {
                const updated = await updateAdminUser(record.id, { role: value as any });
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
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag
          color={status === 'locked' ? 'red' : 'success'}
          style={{ fontWeight: 700, minWidth: 80, textAlign: 'center' }}
        >
          {status === 'locked' ? 'Locked' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v?: string) => {
        if (!v) return '-';
        const d = new Date(v);
        return d.toLocaleDateString('vi-VN', { dateStyle: 'short' });
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => {
        const locked = record.status === 'locked';
        return (
          <Space>
            <Button
              size="small"
              danger={!locked}
              type={locked ? 'default' : 'primary'}
              onClick={async () => {
                try {
                  const updated = await updateAdminUser(record.id, { status: locked ? 'active' : 'locked' });
                  setUsers((prev) => prev.map((u) => (u.id === record.id ? updated : u)));
                  message.success(locked ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
                } catch (err: any) {
                  message.error(err?.message || 'Lỗi khi cập nhật trạng thái');
                }
              }}
            >
              {locked ? (
                <>
                  <UnlockOutlined style={{ marginRight: 4 }} />
                  Mở khóa
                </>
              ) : (
                <>
                  <LockOutlined style={{ marginRight: 4 }} />
                  Khóa
                </>
              )}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <Typography.Title level={4} style={{ margin: 0, color: '#2d3436' }}>
          Quản lý người dùng
        </Typography.Title>
      </div>
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <Space size={8} wrap>
            <Input.Search
              size="small"
              allowClear
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              size="small"
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 140 }}
              options={[
                { value: 'all', label: 'Tất cả vai trò' },
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Select
              size="small"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Active' },
                { value: 'locked', label: 'Locked' },
              ]}
            />
          </Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
              load().catch(() => undefined);
            }}
          >
            Làm mới
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredUsers}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}


