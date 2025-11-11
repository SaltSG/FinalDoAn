import { Card, Col, Row, Statistic, Typography, Table, Tag, Space, Spin } from 'antd';
import { useEffect, useState } from 'react';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  MessageOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { getAdminStats, getChatStats, type AdminStats } from '../../services/admin';

const { Title } = Typography;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chatStats, setChatStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminStats(), getChatStats()])
      .then(([statsData, chatData]) => {
        setStats(statsData);
        setChatStats(chatData);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <div>Không thể tải dữ liệu</div>;
  }

  return (
    <div className="container" style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px', color: 'var(--color-secondary)' }}>
        Bảng điều khiển quản trị
      </Title>

      <Row gutter={[16, 16]}>
        {/* Users Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số người dùng"
              value={stats.users.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Quản trị viên"
              value={stats.users.admins}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Sinh viên"
              value={stats.users.students}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Người dùng mới (30 ngày)"
              value={stats.users.recent}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        {/* Deadlines Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số deadline"
              value={stats.deadlines.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã hoàn thành"
              value={stats.deadlines.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đang diễn ra"
              value={stats.deadlines.ongoing}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Quá hạn"
              value={stats.deadlines.overdue}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        {/* Chat Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số tin nhắn"
              value={chatStats?.total || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tin nhắn có file"
              value={chatStats?.withAttachments || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        {/* Curriculum Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SV chuyên ngành Dev"
              value={stats.curriculum.dev.students}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Tag color={stats.curriculum.dev.exists ? 'green' : 'red'}>
                {stats.curriculum.dev.exists ? 'Đã có chương trình' : 'Chưa có chương trình'}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SV chuyên ngành Design"
              value={stats.curriculum.design.students}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Tag color={stats.curriculum.design.exists ? 'green' : 'red'}>
                {stats.curriculum.design.exists ? 'Đã có chương trình' : 'Chưa có chương trình'}
              </Tag>
            </div>
          </Card>
        </Col>

        {/* Results Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Kết quả học tập"
              value={stats.results.total}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Provider Stats */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="Người dùng theo phương thức đăng nhập">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>Đăng nhập local: </Typography.Text>
                <Tag color="blue">{stats.users.local}</Tag>
              </div>
              <div>
                <Typography.Text strong>Đăng nhập Google: </Typography.Text>
                <Tag color="green">{stats.users.google}</Tag>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thống kê Chat">
            {chatStats?.rooms && chatStats.rooms.length > 0 ? (
              <Table
                dataSource={chatStats.rooms}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Room',
                    dataIndex: '_id',
                    key: '_id',
                  },
                  {
                    title: 'Số tin nhắn',
                    dataIndex: 'count',
                    key: 'count',
                  },
                  {
                    title: 'Có file',
                    dataIndex: 'withAttachments',
                    key: 'withAttachments',
                  },
                ]}
              />
            ) : (
              <Typography.Text>Chưa có dữ liệu</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

