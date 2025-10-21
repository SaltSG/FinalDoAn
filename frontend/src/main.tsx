import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './modules/app/App';
import './styles.css';
import 'antd/dist/reset.css';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#f59e0b',
          colorInfo: '#1f3b5b',
          borderRadius: 8
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);


