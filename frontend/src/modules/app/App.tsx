import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import DashboardPage from '../../pages/DashboardPage';
import DeadlinePage from '../../pages/DeadlinePage';
import ProgressPage from '../../pages/ProgressPage';
import ResultsPage from '../../pages/ResultsPage';
import Sidebar from '../../components/Sidebar';
import { Layout } from 'antd';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

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

  return (
    <div className="app">
      <Layout className="layout">
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} logoSrc="/Multimedia.png" />
        <Layout>
          <Navbar rightContent={null} />
          <Routes>
            <Route path="/" element={<DashboardPage logoSrc="/Multimedia.png" />} />
            <Route path="/deadline" element={<DeadlinePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </Layout>
      </Layout>
    </div>
  );
}


