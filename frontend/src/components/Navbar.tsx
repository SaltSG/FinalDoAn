import { Layout } from 'antd';

type NavbarProps = {
  title?: string;
  logoSrc?: string;
  rightContent?: React.ReactNode;
  leftContent?: React.ReactNode;
};

export default function Navbar({ title, logoSrc, rightContent, leftContent }: NavbarProps) {
  return (
    <Layout.Header className="navbar">
      <div className="navbar-left">
        {leftContent}
        {logoSrc ? (
          <img className="navbar-logo" src={logoSrc} alt="Brand logo" />
        ) : null}
        {title ? <span className="navbar-title">{title}</span> : null}
      </div>
      <div className="navbar-right">{rightContent}</div>
    </Layout.Header>
  );
}


