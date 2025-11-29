import { useEffect, useRef, useState } from 'react';
import { Button, Input, Typography, List, Space, Tooltip, message as antdMessage } from 'antd';
import { SendOutlined, CloseOutlined } from '@ant-design/icons';
import { getAuthToken } from '../services/auth';

type ChatbotMessage = {
  id: number;
  from: 'user' | 'bot';
  text: string;
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: Date.now(),
      from: 'bot',
      text: 'Xin chào, mình là chatbot học tập. Bạn có thể hỏi về deadline, điểm/GPA hoặc lộ trình học.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const renderMultiline = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => (
      // eslint-disable-next-line react/no-array-index-key
      <span key={idx}>
        {line}
        {idx < lines.length - 1 && <br />}
      </span>
    ));
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;

    const userMsg: ChatbotMessage = { id: Date.now(), from: 'user', text: content };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
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
      if (!res.ok) throw new Error('response_not_ok');
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply && data.reply.trim() ? data.reply : 'Chatbot hiện không trả lời được, bạn thử lại sau nhé.';
      const botMsg: ChatbotMessage = { id: Date.now() + 1, from: 'bot', text: reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      antdMessage.error('Không gọi được chatbot, hãy kiểm tra service ML (http://127.0.0.1:8000) đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  // Tự động kéo xuống cuối khi mở cửa sổ chatbot
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [open]);

  // Khi có tin nhắn mới, luôn kéo xuống cuối (chatbot thường là hội thoại ngắn)
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages, open]);

  return (
    <>
      {!open && (
        <div className="chatbot-fab-wrap">
          <Tooltip title="Chatbot học tập" placement="left">
            <Button
              className="chat-fab chatbot-fab"
              type="primary"
              shape="circle"
              aria-label="Chatbot học tập"
              onClick={() => setOpen(true)}
            >
              <span className="chatbot-fab-inner">
                <span className="chatbot-face">
                  <span className="chatbot-eye chatbot-eye-left" />
                  <span className="chatbot-eye chatbot-eye-right" />
                  <span className="chatbot-mouth" />
                </span>
              </span>
            </Button>
          </Tooltip>
        </div>
      )}
      {open && (
        <div className="chat-panel chatbot-panel">
          <div className="chat-header">
            <div className="chat-header-main">
              <div className="chatbot-avatar">
                <span className="chatbot-face chatbot-face-sm">
                  <span className="chatbot-eye chatbot-eye-left" />
                  <span className="chatbot-eye chatbot-eye-right" />
                  <span className="chatbot-mouth" />
                </span>
              </div>
              <div className="chat-header-text">
                <Typography.Text className="chat-title" strong>
                  Chatbot học tập
                </Typography.Text>
                <Typography.Text className="chat-subtitle" type="secondary">
                  Phân tích tiến độ, GPA và gợi ý học tập cho bạn
                </Typography.Text>
              </div>
            </div>
            <div className="chat-header-actions">
              <Button
                type="text"
                className="chat-close"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                icon={<CloseOutlined />}
              />
            </div>
          </div>
          <div className="chat-body">
            <div className="chat-list" ref={listRef}>
              <List
                dataSource={messages}
                renderItem={(m) => (
                  <List.Item
                    style={{
                      border: 'none',
                      padding: '4px 0',
                      justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Space
                      align="start"
                      style={{
                        maxWidth: '80%',
                        background: m.from === 'user' ? '#e0f2fe' : '#f3f4f6',
                    borderRadius: 16,
                    padding: '8px 12px',
                      }}
                    >
                      <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
                        {renderMultiline(m.text)}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="chatbot-input-row">
            <Input
              placeholder="Nhập câu hỏi cho chatbot..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={handleSend}
              disabled={loading}
            />
            <Button
              className="chat-send-btn"
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
            />
          </div>
        </div>
      )}
    </>
  );
}


