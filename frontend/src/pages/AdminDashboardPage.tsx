import { useEffect, useState } from 'react';
import { Card, Typography, Space, message, Skeleton, Button } from 'antd';
import { RightOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { AdminUserStats, fetchAdminUserStats } from '../services/admin';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchAdminUserStats()
      .then(setStats)
      .catch((err: any) => {
        message.error(err?.message || 'Không tải được thống kê người dùng');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <Typography.Title level={4} style={{ margin: 0, color: '#2d3436' }}>
          Tổng quan hệ thống
        </Typography.Title>
      </div>
      <Card>
        {loading && !stats ? (
          <Skeleton active paragraph={false} />
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="admin-stats-overview">
              <div className="admin-stats-card">
                <div className="admin-stats-number">
                  {stats ? stats.totalUsers : '-'}
                </div>
                <div className="admin-stats-label">
                  <TeamOutlined style={{ marginRight: 6 }} />
                  User đăng ký
                </div>
              </div>
              <div className="admin-stats-card">
                <div className="admin-stats-number">
                  {stats ? stats.activeLast7Days : '-'}
                </div>
                <div className="admin-stats-label">
                  <UserOutlined style={{ marginRight: 6 }} />
                  Active 7 ngày gần nhất
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Button type="link" onClick={() => navigate('/admin/users')}>
                Quản lý người dùng <RightOutlined />
              </Button>
            </div>
          </Space>
        )}
      </Card>
    </div>
  );
}


