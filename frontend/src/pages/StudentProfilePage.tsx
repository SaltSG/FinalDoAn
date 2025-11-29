import { Card, Descriptions, Avatar, Typography, Button, Space, Input, message } from 'antd';
import { useMemo, useEffect, useState, useRef } from 'react';
import { getAuthUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { uploadChatFile, resolveFileUrl } from '../services/chat';

export default function StudentProfilePage() {
  const user = getAuthUser();
  const navigate = useNavigate();
  const storageKey = `profile.studentId.${user?.id || 'anon'}`;
  const [studentId, setStudentId] = useState<string>('');
  const nameKey = `profile.name.${user?.id || 'anon'}`;
  const avatarKey = `profile.avatarUrl.${user?.id || 'anon'}`;
  const [name, setName] = useState<string>(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.picture || '');
  const [editing, setEditing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) setStudentId(v);
      const n = localStorage.getItem(nameKey);
      if (n) setName(n);
      const a = localStorage.getItem(avatarKey);
      if (a) setAvatarUrl(a);
      // Prefill from auth payload if available (e.g., khi đăng ký đã nhập mã SV)
      if (!v && (user as any)?.studentId) {
        setStudentId(String((user as any).studentId));
      }
    } catch {}
  }, [storageKey, nameKey, avatarKey]);
  const saveProfile = () => {
    try {
      localStorage.setItem(nameKey, (name || '').trim());
      localStorage.setItem(avatarKey, avatarUrl || '');
      localStorage.setItem(storageKey, (studentId || '').trim());
      message.success('Đã lưu thông tin');
      setEditing(false);
    } catch {
      message.error('Không thể lưu, thử lại sau');
    }
  };
  const handlePickAvatar = () => fileInputRef.current?.click();
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.currentTarget.value = '';
    if (!file.type.startsWith('image/')) { message.error('Vui lòng chọn ảnh'); return; }
    try {
      const uploaded = await uploadChatFile(file);
      setAvatarUrl(resolveFileUrl(uploaded.url));
      message.success('Đã tải ảnh đại diện');
    } catch {
      message.error('Tải ảnh thất bại');
    }
  };

  const fields = useMemo(() => {
    return [
      { label: 'Email', value: user?.email || '-' },
      // Hiển thị mã hệ thống (ẩn trong chi tiết để tra cứu khi cần)
      { label: 'Mã hệ thống', value: user?.id || '-', hidden: true },
    ];
  }, [user, name]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                size={64}
                src={avatarUrl || user?.picture}
                onClick={() => { if (editing) handlePickAvatar(); }}
                style={{ cursor: editing ? 'pointer' : 'default' }}
              >
                {(name?.[0] ?? user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              {/* Hidden picker placed near avatar to ensure browser allows programmatic click */}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {editing && (
                <div style={{ marginTop: 6 }}>
                  <Button size="small" onClick={handlePickAvatar}>Tải ảnh lên…</Button>
                </div>
              )}
            </div>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{name || user?.name || 'Sinh viên'}</Typography.Title>
              <Typography.Text style={{ color: '#6b7280' }}>{user?.email}</Typography.Text>
            </div>
          </div>
        }
        extra={
          <Space>
            {editing ? (
              <>
                <Button onClick={() => setEditing(false)}>Hủy</Button>
                <Button type="primary" onClick={saveProfile}>Lưu</Button>
              </>
            ) : (
              <Button type="primary" onClick={() => setEditing(true)}>Chỉnh sửa</Button>
            )}
            <Button onClick={() => navigate(-1)}>Quay lại</Button>
          </Space>
        }
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Họ và tên">
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên"
                style={{ maxWidth: 480 }}
              />
            ) : (
              <Typography.Text>{name || user?.name || '-'}</Typography.Text>
            )}
          </Descriptions.Item>
          {fields.filter((f: any) => !f.hidden).map((f) => (
            <Descriptions.Item key={f.label} label={f.label}>{f.value}</Descriptions.Item>
          ))}
          <Descriptions.Item label="Mã sinh viên">
            {editing ? (
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Nhập mã sinh viên (VD: DHMM123456)"
                style={{ maxWidth: 480 }}
              />
            ) : (
              <Typography.Text>{studentId || 'Chưa thiết lập'}</Typography.Text>
            )}
            <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
              Mã này chỉ lưu trên thiết bị của bạn hiện tại. Bấm “Lưu” ở góc trên để áp dụng thay đổi.
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}


