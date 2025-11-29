import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { GoogleOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { authUserFromGoogleCredential, getAuthUser, setAuthUser, setAuthToken, type AuthUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const gBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!(window as any).google) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
    }
  }, []);

  const goAfterLogin = (user: AuthUser | null | undefined) => {
    if (user?.role === 'admin') navigate('/admin');
    else navigate('/');
  };

  function resolveApiBase(): string {
    const env: any = (import.meta as any).env;
    if (env?.VITE_API_BASE) return String(env.VITE_API_BASE).replace(/\/$/, '');
    const isDev = typeof window !== 'undefined' && location.port === '5173';
    return isDev ? 'http://127.0.0.1:5000' : '';
  }
  const API_BASE = resolveApiBase();

  async function postJson(path: string, body: any) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Tự động render nút Google "chính chủ" khi tab Đăng nhập mở và GSI sẵn sàng
  useEffect(() => {
    if (mode !== 'login') return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      const google = (window as any).google;
      if (!google?.accounts?.id || !gBtnRef.current) {
        if (tries > 40) window.clearInterval(timer);
        return;
      }
      const env: any = (import.meta as any).env;
      const clientId = env?.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          use_fedcm_for_prompt: false,
          callback: async (resp: any) => {
            try {
              const rs = await postJson('/api/auth/google', { credential: resp.credential });
              if (rs && rs.user) setAuthUser(rs.user);
              if (rs && rs.token) setAuthToken(rs.token);
              goAfterLogin(rs?.user as AuthUser | undefined);
            } catch (e: any) {
              try {
                const json = JSON.parse(e?.message || '{}');
                if (json?.message === 'forbidden') return message.error('Tài khoản Google này không được phép');
                if (json?.message === 'invalid_credential') return message.error('Thông tin đăng nhập Google không hợp lệ');
              } catch {}
              message.error('Đăng nhập Google thất bại');
            }
          }
        });
        google.accounts.id.renderButton(gBtnRef.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left', width: 320 });
        window.clearInterval(timer);
      } catch {}
    }, 150);
    return () => { window.clearInterval(timer); };
  }, [mode, navigate]);

  const onFinish = async (values: any) => {
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: values.email, password: values.password }
        : { email: values.email, password: values.password, name: values.fullName ?? values.email.split('@')[0], studentId: values.studentId };
      const rs = await postJson(path, payload);
      if (rs && rs.user) setAuthUser(rs.user);
      if (rs && rs.token) setAuthToken(rs.token);
      goAfterLogin(rs?.user as AuthUser | undefined);
    } catch (e: any) {
      message.error(mode === 'login' ? 'Sai email hoặc mật khẩu' : 'Đăng ký thất bại (email có thể đã tồn tại)');
    }
  };

  const title = mode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới';
  const subtitle = mode === 'login'
    ? 'Đăng nhập để tiếp tục hành trình học tập của bạn'
    : 'Đăng ký và bắt đầu hành trình học tập của bạn!';

  getAuthUser();

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab ${mode==='login' ? 'active' : ''}`} onClick={() => setMode('login')}>Đăng nhập</button>
          <button className={`auth-tab ${mode==='register' ? 'active' : ''}`} onClick={() => setMode('register')}>Đăng ký</button>
        </div>
        <Typography.Title level={3} className="auth-title">{title}</Typography.Title>
        <div className="auth-subtitle">{subtitle}</div>

        {mode === 'login' && (
          <>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <div ref={gBtnRef} />
            </div>
            <div style={{ height: 12 }} />
            <div className="auth-divider"><span>hoặc</span></div>
          </>
        )}

        <div style={{ height: 12 }} />
        <Form layout="vertical" onFinish={onFinish} form={form}>
          {mode === 'register' && (
            <>
              <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên đầy đủ' }]}> 
                <Input size="large" placeholder="Nhập họ và tên đầy đủ" />
              </Form.Item>
              <Form.Item name="studentId" label="Mã sinh viên" rules={[{ required: true, message: 'Nhập mã sinh viên PTIT' }]}> 
                <Input size="large" placeholder="Nhập mã sinh viên PTIT" />
              </Form.Item>
            </>
          )}

          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }]}> 
            <Input size="large" prefix={<MailOutlined />} placeholder={mode==='login' ? 'Nhập email của bạn' : 'Nhập email của bạn'} />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }, ...(mode==='register' ? [{ min: 6, message: 'Tối thiểu 6 ký tự' }] : [])]}> 
            <Input.Password size="large" prefix={<LockOutlined />} placeholder={mode==='login' ? 'Nhập mật khẩu' : 'Tạo mật khẩu mạnh (tối thiểu 6 ký tự)'} />
          </Form.Item>

          {mode === 'register' && (
            <div className="auth-terms">
              Bằng việc đăng ký, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của chúng tôi.
            </div>
          )}

          {mode === 'login' && <div className="auth-forgot">Quên mật khẩu?</div>}
          <div style={{ height: 10 }} />
          <button className="auth-submit" type="submit">{mode==='login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
        </Form>
      </div>
    </div>
  );
}
