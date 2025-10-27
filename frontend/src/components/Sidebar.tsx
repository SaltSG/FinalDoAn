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
  const selectedKeys = location.pathname.startsWith('/summary')
    ? ['summary']
    : location.pathname.startsWith('/results')
    ? ['results']
    : location.pathname.startsWith('/progress')
    ? ['progress']
    : location.pathname.startsWith('/deadline')
    ? ['deadline']
    : ['home'];

  const items = [
    { key: 'home', icon: <HomeOutlined />, label: 'Trang chủ' },
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
        defaultOpenKeys={["study"]}
        items={items}
        onClick={(e) => {
          const key = e.key;
          if (key === 'home') navigate('/');
          else if (key === 'deadline') navigate('/deadline');
          else if (key === 'progress') navigate('/progress');
          else if (key === 'results') navigate('/results');
          else if (key === 'summary') navigate('/summary');
        }}
      />
    </Layout.Sider>
  );
}


