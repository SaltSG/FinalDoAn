import { Layout, Menu } from 'antd';
import { HomeOutlined, ClockCircleOutlined } from '@ant-design/icons';

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  logoSrc?: string;
};

export default function Sidebar({ collapsed, onCollapse, logoSrc }: SidebarProps) {
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
      <Menu mode="inline" defaultSelectedKeys={["home"]}>
        <Menu.Item key="home" icon={<HomeOutlined />}>Trang chủ</Menu.Item>
        <Menu.Item key="deadline" icon={<ClockCircleOutlined />}>Deadline</Menu.Item>
      </Menu>
    </Layout.Sider>
  );
}


