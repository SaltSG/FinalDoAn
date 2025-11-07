import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Input, Space, Typography, Avatar, notification } from 'antd';
import { MessageOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { getAuthUser, getAuthToken as getTokenFn } from '../services/auth';
import { ChatMessageDto, fetchMessages, sendMessage as sendMessageRest, subscribe as subscribeSse, getUnreadCount as getUnreadApi, markRead as markReadApi } from '../services/chat';
import { subscribeToRoom, sendChat, sendTyping } from '../services/realtime';
import { sendRead } from '../services/realtime';
import { getAuthToken } from '../services/auth';

type Props = { room?: string };

export default function ChatWidget({ room = 'global' }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const typingTimer = useRef<number | null>(null);
  const [authUser, setAuthUserState] = useState(getAuthUser());
  const [token, setToken] = useState<string | null>(getTokenFn());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const readOnceRef = useRef<boolean>(false);
  const [unread, setUnread] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const onlineSetRef = useRef<Set<string>>(new Set());
  const [onlineCount, setOnlineCount] = useState(0);
  const [readBy, setReadBy] = useState<Record<string, Record<string, true>>>({});
  const userKey = authUser?.id || 'anon';
  const unreadKey = useMemo(() => `chat.unread.${room}.${userKey}`, [room, userKey]);
  const lastSeenKey = useMemo(() => `chat.lastSeen.${room}.${userKey}`, [room, userKey]);
  const lastSeenRef = useRef<number>(0);

  // Ask for Notification permission once
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  }, []);

  function notifyIncoming(fromName: string, text: string) {
    // Only show system notification when tab is not visible; otherwise rely on badge count
    const title = fromName || 'Tin nhắn mới';
    const body = text.length > 140 ? text.slice(0, 137) + '…' : text;
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(title, { body });
      }
    } catch {}
  }

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === 'auth.user') setAuthUserState(getAuthUser());
      if (!e || e.key === 'auth.token') setToken(getTokenFn());
    };
    const onFocus = () => { setAuthUserState(getAuthUser()); setToken(getTokenFn()); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchMessages(room, 100).then(setMessages).catch(() => {});
  }, [open, room]);

  // Load persisted unread on mount/room change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(unreadKey);
      if (raw) setUnread(Number(raw) || 0);
      const ls = localStorage.getItem(lastSeenKey);
      lastSeenRef.current = ls ? Number(ls) || 0 : 0;
    } catch {}
  }, [unreadKey, lastSeenKey]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const off = subscribeToRoom(room, {
        onMessage: (payload) => {
          setMessages((prev) => [...prev, payload]);
          const fromMe = payload?.userId && authUser?.id && payload.userId === authUser.id;
          if (!open && !fromMe) {
            setUnread((n) => {
              const v = n + 1;
              try { localStorage.setItem(unreadKey, String(v)); } catch {}
              return v;
            });
          }
          // Notify if chat closed or tab not visible and message from others
          if ((!open || document.visibilityState !== 'visible') && !fromMe) {
            notifyIncoming(payload.userName || 'Bạn học', payload.content || '');
          }
        },
        onTyping: (p) => {
          if (!p?.userId || p.userId === authUser?.id) return;
          setTypingUsers((prev) => {
            const next = { ...prev } as Record<string, string>;
            if (p.typing) next[p.userId] = p.userName || 'Bạn học'; else delete next[p.userId];
            return next;
          });
        },
        onRead: (p) => {
          if (!p?.messageId || !p.readerId) return;
          if (p.readerId === authUser?.id) return;
          setReadBy((prev) => {
            const next = { ...prev } as Record<string, Record<string, true>>;
            const map = { ...(next[p.messageId] || {}) } as Record<string, true>;
            map[p.readerId] = true;
            next[p.messageId] = map;
            return next;
          });
        },
        onPresence: (p) => {
          if (!p?.userId) return;
          const set = onlineSetRef.current;
          if (p.online) set.add(p.userId); else set.delete(p.userId);
          setOnlineCount(set.size);
        },
      });
      return off;
    }
    const offSse = subscribeSse(room, (evt) => {
      if (evt?.type === 'message') {
        setMessages((prev) => [...prev, evt.data]);
        const fromMe = evt.data?.userId && authUser?.id && evt.data.userId === authUser.id;
        if (!open && !fromMe) {
          setUnread((n) => {
            const v = n + 1;
            try { localStorage.setItem(unreadKey, String(v)); } catch {}
            return v;
          });
        }
        if ((!open || document.visibilityState !== 'visible') && !fromMe) {
          notifyIncoming(evt.data.userName || 'Bạn học', evt.data.content || '');
        }
      }
    });
    return offSse;
  }, [room, open, unreadKey, token, authUser?.id]);

  // When user/token changes while chat is closed, get server-side unread count
  useEffect(() => {
    if (open) return; // only when widget is closed
    if (!getAuthToken()) return;
    let isCancelled = false;
    getUnreadApi(room)
      .then(({ unread }) => {
        if (isCancelled) return;
        setUnread(unread);
        try { localStorage.setItem(unreadKey, String(unread)); } catch {}
        if (unread > 0 && document.visibilityState !== 'visible') {
          notifyIncoming('Tin nhắn mới', `${unread} tin chưa đọc`);
        }
      })
      .catch(() => {});
    return () => { isCancelled = true; };
  }, [authUser?.id, token, room, open, unreadKey]);

  // Mark read when user scrolls to bottom
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el) return;
    const nearBottom = () => (el.scrollHeight - el.scrollTop - el.clientHeight) < 12;
    const onScroll = () => {
      if (!getAuthToken()) return;
      if (nearBottom() && !readOnceRef.current) {
        readOnceRef.current = true;
        setUnread(0);
        try { localStorage.setItem(unreadKey, '0'); } catch {}
        markReadApi(room).catch(() => {});
        const lastOther = [...messages].reverse().find((m) => m.userId && authUser?.id && m.userId !== authUser.id);
        if (lastOther?._id) { try { sendRead(room, lastOther._id); } catch {} }
        window.setTimeout(() => { readOnceRef.current = false; }, 800);
      }
    };
    el.addEventListener('scroll', onScroll);
    onScroll(); // trigger once
    return () => { el.removeEventListener('scroll', onScroll); };
  }, [open, room, unreadKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => {
    if (!open || !messages.length || !getAuthToken()) return;
    const last = [...messages].reverse().find((m) => m.userId && authUser?.id && m.userId !== authUser.id);
    if (last?._id) {
      try { sendRead(room, last._id); } catch {}
    }
  }, [messages, open, room]);

  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const mm = messages[i];
      if (mm.userId && authUser?.id && mm.userId === authUser.id) return mm._id;
    }
    return undefined;
  }, [messages, authUser?.id]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    try {
      const token = getAuthToken();
      if (token) {
        try {
          await sendChat(room, content);
        } catch {
          // Fallback to REST if socket failed
          await sendMessageRest(room, authUser?.id || 'anonymous', authUser?.name || authUser?.email, content);
        }
      } else {
        await sendMessageRest(room, authUser?.id || 'anonymous', authUser?.name || authUser?.email, content);
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      {!open && (
        <Badge count={unread} overflowCount={99} offset={[-2, 10]} className="chat-fab-badge">
          <Button className="chat-fab" type="primary" shape="circle" aria-label="Chat"
            onClick={async () => { setOpen(true); setUnread(0); try { localStorage.setItem(unreadKey, '0'); lastSeenRef.current = Date.now(); localStorage.setItem(lastSeenKey, String(lastSeenRef.current)); } catch {} if (getAuthToken()) { try { await markReadApi(room); } catch {} } }}>
            <MessageOutlined />
          </Button>
        </Badge>
      )}
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <Typography.Text className="chat-title" strong>Chat sinh viên{getAuthToken() ? ` • ${onlineCount} online` : ''}</Typography.Text>
            <Button type="text" className="chat-close" aria-label="Đóng" onClick={() => { setOpen(false); try { lastSeenRef.current = Date.now(); localStorage.setItem(lastSeenKey, String(lastSeenRef.current)); } catch {} }} icon={<CloseOutlined />} />
          </div>
          <div className="chat-body">
            <div className="chat-list" ref={listRef}>
              {messages.map((m) => {
                const isMine = (m.userId && authUser?.id && m.userId === authUser.id);
                const isLastMine = isMine && lastMineId && m._id === lastMineId;
                const readCount = isLastMine ? Object.keys(readBy[m._id] || {}).length : 0;
                return (
                  <div key={m._id}>
                    <div className={isMine ? 'msg-row mine' : 'msg-row theirs'}>
                      <Avatar size={24} className="msg-avatar">{(isMine ? (authUser?.name?.[0] || authUser?.email?.[0] || 'U') : (m.userName?.[0] || m.userId?.[0] || 'U')).toUpperCase()}</Avatar>
                      <div className={isMine ? 'msg-bubble mine' : 'msg-bubble theirs'}>
                        {!isMine && <div className="msg-name">{m.userName || m.userId}</div>}
                        <div className="msg-text">{m.content}</div>
                      </div>
                    </div>
                    {isLastMine && readCount > 0 && (
                      <div style={{ margin: '2px 6px 0 6px', fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
                        {readCount === 1 ? 'Đã xem' : `Đã xem bởi ${readCount}`}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="chat-input-row">
            {Object.keys(typingUsers).length > 0 && (
              <div style={{ fontSize: 12, color: '#6b7280', padding: '0 8px 6px 8px' }}>
                {Object.values(typingUsers)[0]} đang nhập...
              </div>
            )}
            <Input
              placeholder="Nhập tin nhắn..."
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (getAuthToken()) {
                  try { sendTyping(room, true); } catch {}
                  if (typingTimer.current) window.clearTimeout(typingTimer.current);
                  typingTimer.current = window.setTimeout(() => { try { sendTyping(room, false); } catch {} }, 1200);
                }
              }}
              onPressEnter={handleSend}
            />
            <Button className="chat-send-btn" type="primary" icon={<SendOutlined />} onClick={handleSend} />
          </div>
        </div>
      )}
    </>
  );
}


