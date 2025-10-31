import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import DashboardPage from '../../pages/DashboardPage';
import DeadlinePage from '../../pages/DeadlinePage';
import ProgressPage from '../../pages/ProgressPage';
import ResultsPage from '../../pages/ResultsPage';
import Sidebar from '../../components/Sidebar';
import { Avatar, Dropdown, Layout, Space, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import SummaryPage from '../../pages/SummaryPage';
import LoginPage from '../../pages/LoginPage';
import { getAuthUser, signOut } from '../../services/auth';

export default function App() {
  const [health, setHealth] = useState<string>('Đang kiểm tra...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status ?? 'ok'))
      .catch(() => setHealth('error'));
  }, []);

  const isHealthy = health === 'ok';

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const user = getAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthRoute = location.pathname === '/login';

  const [menuOpen, setMenuOpen] = useState(false);

  const right = user ? (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      arrow
      open={menuOpen}
      onOpenChange={setMenuOpen}
      menu={{
        items: [
          { key: 'name', label: user.name ?? user.email, disabled: true },
          { type: 'divider' },
          { key: 'logout', label: 'Đăng xuất', danger: true },
        ],
        onClick: ({ key }) => {
          if (key === 'logout') { signOut(); navigate('/login'); }
        }
      }}
    >
      <Space className="user-trigger" style={{ cursor: 'pointer', color: '#fff' }}>
        <Avatar size={28} src={user.picture}>{(user.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}</Avatar>
        <span>{user.name ?? user.email}</span>
        <DownOutlined className={menuOpen ? 'caret rotated' : 'caret'} />
      </Space>
    </Dropdown>
  ) : (
    <Link to="/login"><Button size="small" type="primary">Đăng nhập</Button></Link>
  );

  return (
    <div className="app">
      <Layout className="layout">
        {!isAuthRoute && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} logoSrc="/Multimedia.png" />}
        <Layout>
          {!isAuthRoute && <Navbar rightContent={right} />}
          <Routes>
            <Route path="/" element={<DashboardPage logoSrc="/Multimedia.png" />} />
            <Route path="/deadline" element={<DeadlinePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Layout>
      </Layout>
    </div>
  );
}


