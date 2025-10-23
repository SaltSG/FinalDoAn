import { Layout, Menu } from 'antd';
import { HomeOutlined, ClockCircleOutlined, BarChartOutlined, OrderedListOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  logoSrc?: string;
};

export default function Sidebar({ collapsed, onCollapse, logoSrc }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKeys = location.pathname.startsWith('/results') ? ['results'] : location.pathname.startsWith('/progress') ? ['progress'] : location.pathname.startsWith('/deadline') ? ['deadline'] : ['home'];
  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={280}
      className="sider"
      theme="light"
    >
      <div className="sider-header">
        {logoSrc ? <img className="sider-logo" src={logoSrc} alt="logo" /> : <div className="sider-logo placeholder" />}
      </div>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        onClick={(e) => navigate(e.key === 'home' ? '/' : `/${e.key}`)}
      >
        <Menu.Item key="home" icon={<HomeOutlined />}>Trang chủ</Menu.Item>
        <Menu.Item key="deadline" icon={<ClockCircleOutlined />}>Deadline</Menu.Item>
        <Menu.Item key="progress" icon={<BarChartOutlined />}>Tiến trình</Menu.Item>
        <Menu.Item key="results" icon={<OrderedListOutlined />}>Kết quả</Menu.Item>
      </Menu>
    </Layout.Sider>
  );
}


