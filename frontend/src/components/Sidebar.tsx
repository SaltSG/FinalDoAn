import { Layout, Menu } from 'antd';
import { HomeOutlined, ClockCircleOutlined, BarChartOutlined, OrderedListOutlined, CalendarOutlined, CrownOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthUser } from '../services/auth';

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  logoSrc?: string;
};

export default function Sidebar({ collapsed, onCollapse, logoSrc }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();
  const isAdmin = user?.role === 'admin';

  const selectedKeys = isAdmin
    ? location.pathname.startsWith('/admin/users')
      ? ['admin-users']
      : location.pathname.startsWith('/admin/curriculum')
      ? ['admin-curriculum']
      : ['admin-dashboard']
    : location.pathname.startsWith('/summary')
    ? ['summary']
    : location.pathname.startsWith('/results')
    ? ['results']
    : location.pathname.startsWith('/progress')
    ? ['progress']
    : location.pathname.startsWith('/deadline')
    ? ['deadline']
    : location.pathname.startsWith('/calendar')
    ? ['calendar']
    : ['home'];

  const items = isAdmin
    ? [
        { key: 'admin-dashboard', icon: <CrownOutlined />, label: 'Dashboard' } as const,
        { key: 'admin-users', icon: <UserOutlined />, label: 'Người dùng' } as const,
        { key: 'admin-curriculum', icon: <BookOutlined />, label: 'Chương trình học' } as const,
      ]
    : [
        { key: 'home', icon: <HomeOutlined />, label: 'Trang chủ' },
        { key: 'calendar', icon: <CalendarOutlined />, label: 'Lịch' },
        { key: 'deadline', icon: <ClockCircleOutlined />, label: 'Deadline' },
        { key: 'progress', icon: <BarChartOutlined />, label: 'Tiến trình' },
        {
          key: 'study',
          icon: <OrderedListOutlined />,
          label: 'Học tập',
          children: [
            { key: 'results', label: 'Kết quả' },
            { key: 'summary', label: 'Tính điểm môn học' },
          ],
        },
      ];

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={220}
      className="sider"
      theme="light"
    >
      <div className="sider-header">
        {logoSrc ? <img className="sider-logo" src={logoSrc} alt="logo" /> : <div className="sider-logo placeholder" />}
      </div>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={isAdmin ? [] : ['study']}
        items={items}
        onClick={(e) => {
          const key = e.key;
          if (key === 'home') navigate('/');
          else if (key === 'calendar') navigate('/calendar');
          else if (key === 'deadline') navigate('/deadline');
          else if (key === 'progress') navigate('/progress');
          else if (key === 'results') navigate('/results');
          else if (key === 'summary') navigate('/summary');
          else if (key === 'admin-dashboard') navigate('/admin');
          else if (key === 'admin-users') navigate('/admin/users');
          else if (key === 'admin-curriculum') navigate('/admin/curriculum');
        }}
      />
    </Layout.Sider>
  );
}


