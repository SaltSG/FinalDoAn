import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import DashboardPage from '../../pages/DashboardPage';
import DeadlinePage from '../../pages/DeadlinePage';
import ProgressPage from '../../pages/ProgressPage';
import ResultsPage from '../../pages/ResultsPage';
import Sidebar from '../../components/Sidebar';
import { Avatar, Dropdown, Layout, Space, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import NotificationBell from '../../components/NotificationBell';
import ChatWidget from '../../components/ChatWidget';
import ChatbotWidget from '../../components/ChatbotWidget';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import SummaryPage from '../../pages/SummaryPage';
import LoginPage from '../../pages/LoginPage';
import { getAuthUser, signOut } from '../../services/auth';
import StudentProfilePage from '../../pages/StudentProfilePage';
import CalendarPage from '../../pages/CalendarPage';
import ChatbotPage from '../../pages/ChatbotPage';
import AdminUsersPage from '../../pages/AdminUsersPage';
import AdminDashboardPage from '../../pages/AdminDashboardPage';
import AdminCurriculumPage from '../../pages/AdminCurriculumPage';

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
  const displayName = (() => {
    try {
      const v = user?.id ? localStorage.getItem(`profile.name.${user.id}`) : null;
      return v && v.trim() ? v : (user?.name ?? user?.email);
    } catch {
      return user?.name ?? user?.email;
    }
  })();
  const displayAvatar = (() => {
    try {
      const v = user?.id ? localStorage.getItem(`profile.avatarUrl.${user.id}`) : null;
      return v && v.trim() ? v : (user?.picture as any);
    } catch {
      return (user?.picture as any);
    }
  })();

  const right = user ? (
    <Space size={16} align="center">
      <NotificationBell />
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        arrow
        open={menuOpen}
        onOpenChange={setMenuOpen}
        menu={{
          items: [
            { key: 'name', label: displayName || (user.name ?? user.email), disabled: true },
            { type: 'divider' },
            { key: 'profile', label: 'Thông tin sinh viên' },
            { type: 'divider' },
            { key: 'logout', label: 'Đăng xuất', danger: true },
          ],
          onClick: ({ key }) => {
            if (key === 'profile') { setMenuOpen(false); navigate('/profile'); }
            if (key === 'logout') { signOut(); navigate('/login'); }
          }
        }}
      >
        <Space className="user-trigger" style={{ cursor: 'pointer', color: '#fff' }}>
          <span>{displayName || (user.name ?? user.email)}</span>
          <Avatar size={36} src={displayAvatar}>{(displayName?.[0] ?? user.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}</Avatar>
          <DownOutlined className={menuOpen ? 'caret rotated' : 'caret'} />
        </Space>
      </Dropdown>
    </Space>
  ) : (
    <Link to="/login"><Button size="small" type="primary">Đăng nhập</Button></Link>
  );

  return (
    <div className="app">
      <Layout className="layout">
        {!isAuthRoute && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} logoSrc="/Multimedia.png" />}
        <Layout>
          {!isAuthRoute && <Navbar rightContent={right} />}
          {!isAuthRoute && <ChatWidget />}
          {!isAuthRoute && <ChatbotWidget />}
          <div className="content">
            <Routes>
              <Route
                path="/"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <DashboardPage logoSrc="/Multimedia.png" />
                  )
                }
              />
              <Route
                path="/deadline"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <DeadlinePage />
                  )
                }
              />
              <Route
                path="/calendar"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <CalendarPage />
                  )
                }
              />
              <Route
                path="/progress"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <ProgressPage />
                  )
                }
              />
              <Route
                path="/results"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <ResultsPage />
                  )
                }
              />
              <Route
                path="/summary"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <SummaryPage />
                  )
                }
              />
              <Route
                path="/profile"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <StudentProfilePage />
                  )
                }
              />
              <Route
                path="/chatbot"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <ChatbotPage />
                  )
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  user?.role === 'admin' ? (
                    <AdminDashboardPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/admin/users"
                element={
                  user?.role === 'admin' ? (
                    <AdminUsersPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/admin/curriculum"
                element={
                  user?.role === 'admin' ? (
                    <AdminCurriculumPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="*"
                element={
                  user?.role === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Routes>
          </div>
        </Layout>
      </Layout>
    </div>
  );
}


