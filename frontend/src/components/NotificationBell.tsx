import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Popover, List, Typography, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuthUser } from '../services/auth';
import { fetchDeadlines as apiFetchDeadlines } from '../services/deadlines';

export type NotificationItem = {
  id: string;
  title: string;
  time?: string;
  status?: 'overdue' | 'ongoing' | 'upcoming' | 'completed';
};

type NotificationBellProps = {
  items?: NotificationItem[];
  count?: number; // số lượng hiển thị trên badge; nếu không truyền, lấy theo items.length
  onOpenChange?: (open: boolean) => void;
};

export default function NotificationBell({ items = [], count, onOpenChange }: NotificationBellProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [autoItems, setAutoItems] = useState<NotificationItem[] | undefined>(undefined);
  const [unread, setUnread] = useState<boolean>(false);
  const itemsRef = useRef<NotificationItem[] | undefined>(undefined);

  const getOverdueShownSet = () => {
    try {
      const raw = localStorage.getItem('notif.deadline.overdueShownIds');
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  };

  const addOverdueShown = (ids: string[]) => {
    try {
      const set = getOverdueShownSet();
      ids.forEach((i) => set.add(i));
      localStorage.setItem('notif.deadline.overdueShownIds', JSON.stringify(Array.from(set)));
    } catch {}
  };

  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    apiFetchDeadlines(u.id)
      .then((rs) => {
        const list: NotificationItem[] = rs
          // include overdue + ongoing + upcoming, exclude completed
          .filter((d) => d.status !== 'completed')
          // prioritize overdue first, then by nearest endAt
          .sort((a, b) => {
            const ao = a.status === 'overdue' ? -1 : 0;
            const bo = b.status === 'overdue' ? -1 : 0;
            if (ao !== bo) return ao - bo; // overdue first
            return new Date(a.endAt || a.createdAt).getTime() - new Date(b.endAt || b.createdAt).getTime();
          })
          .map((d) => ({
            id: d._id,
            title: `${d.title} — ${d.status === 'overdue' ? 'Quá hạn từ' : 'Hạn'}: ${d.endAt ? dayjs(d.endAt).format('DD/MM/YYYY HH:mm') : 'Chưa có'}`,
            time: d.endAt ? dayjs(d.endAt).format('DD/MM/YYYY HH:mm') : undefined,
            status: d.status,
          }));
        setAutoItems(list);
        itemsRef.current = list;

        // 1) Overdue: notify ONLY ONCE per item
        const shown = getOverdueShownSet();
        const newOverdue = list.filter((it) => it.status === 'overdue' && !shown.has(it.id));
        if (newOverdue.length) {
          setUnread(true);
          setOpen(true);
          addOverdueShown(newOverdue.map((i) => i.id));
          return; // don't trigger periodic rule immediately
        }

        // 2) Non-overdue: periodic (mỗi 12 tiếng)
        const nonOverdue = list.filter((it) => it.status !== 'overdue');
        const nowTs = Date.now();
        let lastTs = 0;
        try { lastTs = parseInt(localStorage.getItem('notif.deadline.lastShownTs') || '0', 10); } catch {}
        if (nonOverdue.length > 0 && nowTs - lastTs >= 43_200_000) {
          setUnread(true);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  // Ticker: kiểm tra định kỳ (mỗi phút) nhưng chỉ mở nếu đã qua 12 tiếng kể từ lần gần nhất
  useEffect(() => {
    const id = setInterval(() => {
      const list = (itemsRef.current || autoItems || []).filter((it) => it.status !== 'overdue');
      if (!list.length) return;
      let lastTs = 0;
      try { lastTs = parseInt(localStorage.getItem('notif.deadline.lastShownTs') || '0', 10); } catch {}
      const nowTs = Date.now();
      if (nowTs - lastTs >= 43_200_000) {
        setUnread(true);
        setOpen(true);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [autoItems]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      try { localStorage.setItem('notif.deadline.lastShownTs', String(Date.now())); } catch {}
      setUnread(false);
    }
    onOpenChange?.(v);
  };

  const mergedItems = useMemo(() => (items && items.length ? items : (autoItems || [])), [items, autoItems]);

  const content = mergedItems.length ? (
    <List
      dataSource={mergedItems}
      split
      renderItem={(it) => (
        <List.Item key={it.id}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography.Text strong>{it.title}</Typography.Text>
            {it.time ? (
              <Typography.Text style={{ fontSize: 12, color: it.status === 'overdue' ? '#d63031' : 'rgba(0,0,0,0.45)' }}>
                {it.time}
              </Typography.Text>
            ) : null}
          </div>
        </List.Item>
      )}
      style={{ minWidth: 260, maxWidth: 320 }}
    />
  ) : (
    <div style={{ width: 260 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
    </div>
  );

  const badgeCount = typeof count === 'number' ? count : mergedItems.length;

  return (
    <Popover
      placement="bottomRight"
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      title={<Typography.Text strong>Thông báo Deadline</Typography.Text>}
      content={content}
      overlayClassName="notif-popover"
    >
      <Button className="nav-bell-btn" type="text" aria-label="Thông báo">
        <Badge count={(unread ? badgeCount : 0) || 0} overflowCount={99} className="nav-bell-badge">
          <BellOutlined style={{ color: 'var(--color-primary)' }} />
        </Badge>
      </Button>
    </Popover>
  );
}


