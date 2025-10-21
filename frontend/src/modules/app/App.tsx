import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import DashboardPage from '../../pages/DashboardPage';
import Sidebar from '../../components/Sidebar';
import { Layout } from 'antd';

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
          <DashboardPage logoSrc="/Multimedia.png" />
        </Layout>
      </Layout>
    </div>
  );
}


