import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Input, Typography, Avatar } from 'antd';
import { MessageOutlined, SendOutlined, CloseOutlined, PaperClipOutlined, PictureOutlined } from '@ant-design/icons';
import { getAuthUser, getAuthToken as getTokenFn } from '../services/auth';
import { ChatMessageDto, fetchMessages, sendMessage as sendMessageRest, subscribe as subscribeSse, getUnreadCount as getUnreadApi, markRead as markReadApi, uploadChatFile, resolveFileUrl } from '../services/chat';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imgError, setImgError] = useState<Record<string, true>>({});
  const [pendingMap, setPendingMap] = useState<Record<string, number>>({});
  const lastTypingUpdateRef = useRef<number>(0);
  const justOpenedRef = useRef<boolean>(false);
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
    justOpenedRef.current = true;
    fetchMessages(room, 100).then(setMessages).catch(() => {});
  }, [open, room]);
  // When open toggles to true, ensure we scroll to latest once
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [open]);

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
          if (open) setMessages((prev) => [...prev, payload]);
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
          notifyIncoming(payload.userName || 'Bạn học', payload.content || (payload.attachment?.name || 'Tệp mới'));
          }
        },
        onTyping: (p) => {
          if (!p?.userId || p.userId === authUser?.id) return;
          const now = Date.now();
          if (now - lastTypingUpdateRef.current < 200) return; // throttle to 5fps
          lastTypingUpdateRef.current = now;
          setTypingUsers((prev) => {
            const next = { ...prev } as Record<string, string>;
            if (p.typing) next[p.userId] = p.userName || 'Bạn học'; else delete next[p.userId];
            return next;
          });
          // Only auto-scroll if user is already near the bottom, avoid interrupting reading older messages
          if (open) {
            const el = listRef.current;
            if (el) {
              const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 130;
              if (nearBottom) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
            }
          }
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
        if (open) setMessages((prev) => [...prev, evt.data]);
        const fromMe = evt.data?.userId && authUser?.id && evt.data.userId === authUser.id;
        if (!open && !fromMe) {
          setUnread((n) => {
            const v = n + 1;
            try { localStorage.setItem(unreadKey, String(v)); } catch {}
            return v;
          });
        }
        if ((!open || document.visibilityState !== 'visible') && !fromMe) {
          notifyIncoming(evt.data.userName || 'Bạn học', evt.data.content || (evt.data.attachment?.name || 'Tệp mới'));
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
  }, [open, room, unreadKey, messages, authUser?.id]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
    if (nearBottom) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [messages, open]);

  // On first open (or after reload then open), always jump to the latest message
  useEffect(() => {
    if (!open) return;
    if (!justOpenedRef.current) return;
    const smoothScroll = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    requestAnimationFrame(smoothScroll);
    setTimeout(smoothScroll, 50);
    setTimeout(smoothScroll, 200);
    justOpenedRef.current = false;
  }, [messages, open]);
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
          await sendMessageRest(room, content);
        }
      } else { /* unauthenticated: do nothing to enforce JWT-based send */ }
    } catch { /* ignore */ }
  };

  return (
    <>
      {!open && (
        <Badge count={unread} overflowCount={99} offset={[-2, 10]} className="chat-fab-badge">
          <Button className="chat-fab" type="primary" shape="circle" aria-label="Chat"
            onClick={async () => { setOpen(true); justOpenedRef.current = true; setUnread(0); try { localStorage.setItem(unreadKey, '0'); lastSeenRef.current = Date.now(); localStorage.setItem(lastSeenKey, String(lastSeenRef.current)); } catch {} if (getAuthToken()) { try { await markReadApi(room); } catch {} } }}>
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
                const hasAttachment = !!(m.attachment && typeof (m.attachment as any).url === 'string' && (m.attachment as any).url);
                const ext = hasAttachment ? ((m.attachment?.name || '').toLowerCase().split('.').pop() || '') : '';
                const isImage = hasAttachment && (
                  (m.attachment!.mimeType || '').startsWith('image/') ||
                  ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)
                );
                const linkLabel = hasAttachment ? (m.attachment?.name || (m.content && !isImage ? m.content : '') || 'Tệp đính kèm') : '';
                const showText = hasAttachment ? !!(m.content && m.content.trim() !== linkLabel.trim()) : true;
                const typeKey = (() => {
                  if (!m.attachment) return 'file';
                  if (ext === 'pdf' || m.attachment.mimeType === 'application/pdf') return 'pdf';
                  if (['doc', 'docx'].includes(ext)) return 'doc';
                  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
                  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
                  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
                  if (['txt', 'md', 'rtf'].includes(ext)) return 'txt';
                  if ((m.attachment.mimeType || '').startsWith('audio/')) return 'audio';
                  if ((m.attachment.mimeType || '').startsWith('video/')) return 'video';
                  return 'file';
                })();
                const badgeText = ({ pdf:'PDF', doc:'DOC', xls:'XLS', ppt:'PPT', zip:'ZIP', txt:'TXT', audio:'AUDIO', video:'VIDEO', file:'FILE' } as Record<string,string>)[typeKey];
                const bubbleClass = `msg-bubble ${isMine ? 'mine' : 'theirs'}${isImage ? ' img' : ''}`;
                return (
                  <div key={m._id}>
                    <div className={isMine ? 'msg-row mine' : 'msg-row theirs'}>
                      <Avatar size={24} className="msg-avatar">{(isMine ? (authUser?.name?.[0] || authUser?.email?.[0] || 'U') : (m.userName?.[0] || m.userId?.[0] || 'U')).toUpperCase()}</Avatar>
                      <div className={bubbleClass}>
                        {!isMine && <div className="msg-name">{m.userName || m.userId}</div>}
                        {hasAttachment ? (
                          <div className="msg-text">
                            {isImage && !imgError[m._id] ? (
                              <a href={resolveFileUrl(m.attachment!.url)} target="_blank" rel="noreferrer">
                                <div className="msg-image-wrap">
                                  <img
                                    src={resolveFileUrl(m.attachment!.url)}
                                    alt={m.attachment!.name}
                                    className="msg-image"
                                    onError={() => setImgError((s) => ({ ...s, [m._id]: true }))}
                                  />
                                  {pendingMap[m._id] && pendingMap[m._id] < 100 && (
                                    <div className="msg-image-progress"><span style={{ width: `${pendingMap[m._id]}%` }} /></div>
                                  )}
                                </div>
                              </a>
                            ) : (
                              isImage
                                ? (
                                  <a href={resolveFileUrl(m.attachment!.url)} target="_blank" rel="noreferrer" className="file-link">
                                    <span className="file-name">{m.attachment!.name || 'Ảnh'}</span>
                                  </a>
                                ) : (
                                  <a href={resolveFileUrl(m.attachment!.url)} target="_blank" rel="noreferrer" className="file-link">
                                    <span className={`file-badge file-badge-${typeKey}`}>{badgeText}</span>
                                    <span className="file-name">{linkLabel}</span>
                                  </a>
                                )
                            )}
                            {showText && <div style={{ marginTop: 6 }}>{m.content}</div>}
                          </div>
                        ) : (
                          <div className="msg-text">{m.content}</div>
                        )}
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
              {Object.keys(typingUsers).length > 0 && (
                <div className="typing-indicator-row">
                  <div className="typing-indicator-bubble">
                    Mọi người đang nhập...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="chat-input-row">
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              e.currentTarget.value = '';
              try {
                const uploaded = await uploadChatFile(file);
                const token = getAuthToken();
                if (token) {
                  await sendChat(room, file.name, uploaded);
                } else {
                  // fallback via REST: create a message with attachment not supported -> skip REST for files
                }
              } catch {}
            }} />
            <Button className="chat-attach-btn" type="text" aria-label="Đính kèm tệp" icon={<PaperClipOutlined />} onClick={() => fileInputRef.current?.click()} />
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              e.currentTarget.value = '';
              try {
                const tmpId = `tmp:${Date.now()}`;
                const localUrl = URL.createObjectURL(file);
                setMessages((prev) => [...prev, {
                  _id: tmpId,
                  room,
                  userId: authUser?.id || 'me',
                  userName: authUser?.name || authUser?.email,
                  content: file.name,
                  attachment: { url: localUrl, name: file.name, size: file.size, mimeType: file.type },
                  createdAt: new Date().toISOString(),
                } as any]);
                setPendingMap((s) => ({ ...s, [tmpId]: 1 }));

                const uploaded = await uploadChatFile(file, (p) => setPendingMap((s) => ({ ...s, [tmpId]: p })));
                const token = getAuthToken();
                if (token) {
                  await sendChat(room, file.name, uploaded);
                }
                setMessages((prev) => prev.filter((m) => m._id !== tmpId));
                setPendingMap((s) => { const n = { ...s }; delete n[tmpId]; return n; });
                URL.revokeObjectURL(localUrl);
              } catch {}
            }} />
            <Button className="chat-image-btn" type="text" aria-label="Gửi ảnh" icon={<PictureOutlined />} onClick={() => imageInputRef.current?.click()} />
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


