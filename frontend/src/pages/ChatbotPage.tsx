import { useState } from 'react';
import { Card, List, Input, Button, Typography, Space, message as antdMessage } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { getAuthToken } from '../services/auth';

type ChatMessage = {
  id: number;
  from: 'user' | 'bot';
  text: string;
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: Date.now(),
      from: 'bot',
      text: 'Xin chào, mình là chatbot học tập. Bạn có thể hỏi về deadline, điểm/GPA hoặc lộ trình học.',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      from: 'user',
      text: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        throw new Error('response_not_ok');
      }

      const data = (await res.json()) as { reply?: string };
      const reply = data.reply && data.reply.trim() ? data.reply : 'Chatbot hiện không trả lời được, bạn thử lại sau nhé.';

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        from: 'bot',
        text: reply,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      antdMessage.error('Không gọi được chatbot, hãy kiểm tra service ML (http://127.0.0.1:8000) đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Chatbot học tập
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Đây là kênh chat riêng với chatbot (khác với chat sinh viên). Bạn có thể thử hỏi về deadline, điểm hoặc GPA.
      </Typography.Paragraph>
      <Card bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', height: '60vh' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, paddingRight: 4 }}>
          <List
            dataSource={messages}
            renderItem={(item) => (
              <List.Item
                style={{
                  border: 'none',
                  padding: '4px 0',
                  justifyContent: item.from === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Space
                  align="start"
                  style={{
                    maxWidth: '80%',
                    background: item.from === 'user' ? '#e0f2fe' : '#f3f4f6',
                    borderRadius: 16,
                    padding: '8px 12px',
                  }}
                >
                  {item.from === 'bot' ? <RobotOutlined /> : <UserOutlined />}
                  <Typography.Text>{item.text}</Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Nhập câu hỏi cho chatbot..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={sendMessage}
            disabled={loading}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={loading}>
            Gửi
          </Button>
        </Space.Compact>
      </Card>
    </div>
  );
}


