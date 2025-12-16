import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Popover,
  List,
  Typography,
  Empty,
  Tag,
  notification,
  Dropdown,
  Checkbox,
} from 'antd';
import { BellOutlined, MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuthUser } from '../services/auth';
import { fetchDeadlines as apiFetchDeadlines } from '../services/deadlines';
import { fetchEvents as apiFetchEvents } from '../services/events';

function formatTimeRemaining(endAt: dayjs.Dayjs): string {
  const now = dayjs();
  const diffMinutes = endAt.diff(now, 'minute');
  
  if (diffMinutes <= 0) {
    return 'Đã đến hạn';
  }
  
  if (diffMinutes < 60) {
    return `Còn ${diffMinutes} phút nữa`;
  }
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (minutes === 0) {
    return `Còn ${hours} giờ nữa`;
  }
  
  return `Còn ${hours} giờ ${minutes} phút nữa`;
}

export function getNotificationIconAndColor(
  kind?: 'deadline' | 'exam' | 'event',
  isExam?: boolean,
  status?: 'overdue' | 'ongoing' | 'upcoming' | 'completed'
): { icon: string; color: string } {
  const effectiveKind = kind || (isExam ? 'exam' : 'deadline');
  
  if (effectiveKind === 'exam') {
    if (status === 'completed') {
      return { icon: '🎓', color: '#eab308' };
    }
    return { icon: '📝', color: '#fbbf24' };
  }
  
  if (effectiveKind === 'event') {
    return { icon: '📅', color: '#3b82f6' };
  }
  
  if (status === 'overdue') {
    return { icon: '⏰', color: '#ef4444' }; 
  }
  if (status === 'ongoing') {
    return { icon: '⏰', color: '#f97316' };
  }
  if (status === 'completed') {
    return { icon: '✓', color: '#9ca3af' };
  }
  return { icon: '⏰', color: '#f97316' };
}

export type NotificationItem = {
  id: string;
  title: string; 
  time?: string; 
  deadlineAt?: string;
  kind?: 'deadline' | 'exam' | 'event';
  status?: 'overdue' | 'ongoing' | 'upcoming' | 'completed';
  isExam?: boolean;
};

type NotificationBellProps = {
  items?: NotificationItem[];
  count?: number;
  onOpenChange?: (open: boolean) => void;
};

export default function NotificationBell({ items = [], count, onOpenChange }: NotificationBellProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [autoItems, setAutoItems] = useState<NotificationItem[] | undefined>(undefined);
  const [unread, setUnread] = useState<boolean>(false);
  const itemsRef = useRef<NotificationItem[] | undefined>(undefined);
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('notif.hiddenIds');
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getReadSet = () => {
    try {
      const raw = localStorage.getItem('notif.deadline.readIds');
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  };

  const addReadIds = (ids: string[]) => {
    try {
      const set = getReadSet();
      ids.forEach((i) => set.add(i));
      localStorage.setItem('notif.deadline.readIds', JSON.stringify(Array.from(set)));
    } catch {}
  };

  const getStageMap = (): Record<string, 'day' | '90min' | 'hour' | '15min' | 'minute'> => {
    try {
      const raw = localStorage.getItem('notif.deadline.stages');
      if (!raw) return {};
      const obj = JSON.parse(raw) as Record<string, 'day' | '90min' | 'hour' | '15min' | 'minute'>;
      return obj || {};
    } catch {
      return {};
    }
  };

  const saveStageMap = (m: Record<string, 'day' | '90min' | 'hour' | '15min' | 'minute'>) => {
    try {
      localStorage.setItem('notif.deadline.stages', JSON.stringify(m));
    } catch {}
  };

  const getExamDailyMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('notif.exam.daily');
      if (!raw) return {};
      const obj = JSON.parse(raw) as Record<string, string>;
      return obj || {};
    } catch {
      return {};
    }
  };

  const saveExamDailyMap = (m: Record<string, string>) => {
    try {
      localStorage.setItem('notif.exam.daily', JSON.stringify(m));
    } catch {}
  };

  const getEventRemindSet = () => {
    try {
      const raw = localStorage.getItem('notif.events.reminded30');
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  };

  const saveEventRemindSet = (s: Set<string>) => {
    try {
      localStorage.setItem('notif.events.reminded30', JSON.stringify(Array.from(s)));
    } catch {}
  };

  const getOrderMap = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem('notif.items.orderTs');
      if (!raw) return {};
      const obj = JSON.parse(raw) as Record<string, number>;
      return obj || {};
    } catch {
      return {};
    }
  };

  const saveOrderMap = (m: Record<string, number>) => {
    try {
      localStorage.setItem('notif.items.orderTs', JSON.stringify(m));
    } catch {}
  };

  const bumpOrderForIds = (ids: string[]) => {
    if (!ids.length) return;
    const map = getOrderMap();
    const now = Date.now();
    ids.forEach((id) => {
      map[id] = now;
    });
    saveOrderMap(map);
  };

  const getLastShownTs = (): number => {
    try {
      const raw = localStorage.getItem('notif.deadline.lastShownTs');
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  };

  const hideIds = (ids: string[]) => {
    if (!ids.length) return;
    setHidden((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem('notif.hiddenIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const reorderItems = (items: NotificationItem[]): NotificationItem[] => {
    const orderMap = getOrderMap();
    const statusPriority: Record<string, number> = {
      'ongoing': 3,
      'upcoming': 2,
      'overdue': 1,
      'completed': 0,
    };
    return [...items].sort((a, b) => {
      const oa = orderMap[a.id] ?? 0;
      const ob = orderMap[b.id] ?? 0;
      if (oa !== ob) return ob - oa; 
      
      const statusA = statusPriority[a.status || 'upcoming'] || 0;
      const statusB = statusPriority[b.status || 'upcoming'] || 0;
      if (statusA !== statusB) return statusB - statusA;
      
      const ta = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  };

  const triggerBellAndPush = (reason?: string, ids?: string[]) => {
    if (ids && ids.length) {
      bumpOrderForIds(ids);
      if (autoItems && autoItems.length > 0) {
        const reordered = reorderItems(autoItems);
        setAutoItems(reordered);
        itemsRef.current = reordered;
      }
    }
    setUnread(true);
    setOpen(true);

    let messageText = 'Bạn có thông báo mới';
    let descriptionText =
      'Có deadline, lịch thi hoặc lịch học sắp tới. Bạn mở danh sách thông báo để xem chi tiết nhé.';

    if (ids && ids.length) {
      const source = itemsRef.current || autoItems || [];
      const related = source.filter((it) => ids.includes(it.id));

      if (related.length) {
        const makePrefix = (it: NotificationItem): string => {
          const kind = it.kind || (it.isExam ? 'exam' : 'deadline');
          if (kind === 'exam') return 'Lịch thi';
          if (kind === 'event') return 'Lịch học';
          return 'Deadline';
        };

        if (related.length === 1) {
          const it = related[0];
          const prefix = makePrefix(it);
          const { icon } = getNotificationIconAndColor(it.kind, it.isExam, it.status);
          messageText = `${icon} ${prefix} mới: ${it.title}`;

          if (it.deadlineAt) {
            const end = dayjs(it.deadlineAt);
            const today = dayjs().startOf('day');
            const diff = end.startOf('day').diff(today, 'day');

            if (it.kind === 'event') {
              const diffMinutes = end.diff(dayjs(), 'minute');
              if (diffMinutes <= 0) {
                descriptionText = `Đã bắt đầu lúc ${end.format('DD/MM/YYYY HH:mm')}.`;
              } else if (diffMinutes < 60) {
                descriptionText = `Còn ${diffMinutes} phút nữa sẽ bắt đầu (${end.format('DD/MM/YYYY HH:mm')}).`;
              } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                if (minutes === 0) {
                  descriptionText = `Còn ${hours} giờ nữa sẽ bắt đầu (${end.format('DD/MM/YYYY HH:mm')}).`;
                } else {
                  descriptionText = `Còn ${hours} giờ ${minutes} phút nữa sẽ bắt đầu (${end.format('DD/MM/YYYY HH:mm')}).`;
                }
              }
            } else {
              if (it.status === 'overdue') {
                descriptionText = `Quá hạn từ ${end.format('DD/MM/YYYY HH:mm')}.`;
              } else if (diff > 1) {
                descriptionText = `Còn ${diff} ngày (đến ${end.format('DD/MM/YYYY HH:mm')}).`;
              } else if (diff === 1) {
                descriptionText = `Còn 1 ngày (đến ${end.format('DD/MM/YYYY HH:mm')}).`;
              } else if (diff === 0) {
                if (it.status === 'ongoing') {
                  const timeRemaining = formatTimeRemaining(end);
                  descriptionText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')}) - ${timeRemaining}.`;
                } else {
                  descriptionText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')}).`;
                }
              } else {
                descriptionText = `Đã đến hạn (${end.format('DD/MM/YYYY HH:mm')}).`;
              }
            }
          } else if (it.time) {
            descriptionText = `${prefix} diễn ra lúc ${it.time}.`;
          } else {
            descriptionText = `${prefix} mới được cập nhật.`;
          }
        } else {
          messageText = `Có ${related.length} thông báo mới`;
          const lines = related.slice(0, 3).map((it) => {
            const prefix = makePrefix(it);
            const { icon } = getNotificationIconAndColor(it.kind, it.isExam, it.status);
            return `• ${icon} ${prefix}: ${it.title}`;
          });
          if (related.length > 3) {
            lines.push(`… và ${related.length - 3} thông báo khác`);
          }
          descriptionText = lines.join('\n');
        }
      } else if (reason) {
        descriptionText = reason;
      }
    }

    let notificationIcon: string | undefined;
    let notificationColor: string | undefined;
    if (ids && ids.length) {
      const source = itemsRef.current || autoItems || [];
      const related = source.filter((it) => ids.includes(it.id));
      if (related.length > 0) {
        const firstItem = related[0];
        const { icon, color } = getNotificationIconAndColor(
          firstItem.kind,
          firstItem.isExam,
          firstItem.status
        );
        notificationIcon = icon;
        notificationColor = color;
      }
    }

    try {
      notification.open({
        message: notificationIcon ? `${notificationIcon} ${messageText}` : messageText,
        description: descriptionText,
        placement: 'bottomRight',
        duration: 0,
        style: notificationColor ? { borderLeft: `4px solid ${notificationColor}` } : undefined,
      });
    } catch {
    }
  };

  const maybeTriggerUpcomingReminders = (list: NotificationItem[]) => {
    const stageMap = getStageMap();
    let shouldNotify = false;
    const triggeredIds: string[] = [];

    const now = dayjs();

    list.forEach((it) => {
      if (it.kind === 'event') return;
      if (!it.deadlineAt) return;
      if (it.status === 'overdue') return;

      const end = dayjs(it.deadlineAt);
      const diffMinutes = end.diff(now, 'minute');
      if (diffMinutes <= 0) return;

      let stage: 'day' | '90min' | 'hour' | '15min' | 'minute' | null = null;
      if (diffMinutes <= 5) {
        stage = 'minute';
      } else if (diffMinutes <= 15) {
        stage = '15min';
      } else if (diffMinutes <= 60) {
        stage = 'hour';
      } else if (diffMinutes <= 90) {
        stage = '90min';
      } else if (diffMinutes <= 1440) {
        stage = 'day';
      }

      if (!stage) return;

      const prev = stageMap[it.id];
      const order = { day: 1, '90min': 2, hour: 3, '15min': 4, minute: 5 } as const;
      if (!prev || order[stage] > order[prev]) {
        stageMap[it.id] = stage;
        shouldNotify = true;
        triggeredIds.push(it.id);
      }
    });

    if (shouldNotify) {
      saveStageMap(stageMap);
      triggerBellAndPush(undefined, triggeredIds);
    }
  };

  const maybeTriggerEventReminders = (list: NotificationItem[]) => {
    const reminded = getEventRemindSet();
    let shouldNotify = false;
    const triggeredIds: string[] = [];
    const now = dayjs();

    list.forEach((it) => {
      if (it.kind !== 'event') return;
      if (!it.deadlineAt) return;

      const start = dayjs(it.deadlineAt);
      const diffMinutes = start.diff(now, 'minute');

      if (diffMinutes <= 30 && diffMinutes >= 0 && !reminded.has(it.id)) {
        reminded.add(it.id);
        shouldNotify = true;
        triggeredIds.push(it.id);
      }
    });

    if (shouldNotify) {
      saveEventRemindSet(reminded);
      triggerBellAndPush(undefined, triggeredIds);
    }
  };

  const maybeTriggerExamDailyReminders = (list: NotificationItem[]) => {
    const map = getExamDailyMap();
    const today = dayjs().format('YYYY-MM-DD');
    let shouldNotify = false;
    const triggeredIds: string[] = [];
    const now = dayjs();

    list.forEach((it) => {
      if (it.kind !== 'exam') return;
      if (!it.deadlineAt) return;

      const end = dayjs(it.deadlineAt);
      if (end.isBefore(now, 'day')) return;

      const diffDays = end.startOf('day').diff(dayjs().startOf('day'), 'day');
      if (diffDays <= 0) return;

      const last = map[it.id];
      if (last === today) return;

      map[it.id] = today;
      shouldNotify = true;
      triggeredIds.push(it.id);
    });

    if (shouldNotify) {
      saveExamDailyMap(map);
      triggerBellAndPush(undefined, triggeredIds);
    }
  };

  const loadNotifications = useCallback(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    Promise.all([apiFetchDeadlines(u.id), apiFetchEvents()])
      .then(([rsDeadlines, rsEvents]) => {
        const deadlineItems: NotificationItem[] = rsDeadlines
          .filter((d) => d.status !== 'completed')
          .sort(
            (a, b) =>
              new Date(b.endAt || b.createdAt).getTime() -
              new Date(a.endAt || a.createdAt).getTime()
          )
          .map((d) => ({
            id: d._id,
            title: d.title,
            time: d.endAt ? dayjs(d.endAt).format('DD/MM/YYYY HH:mm') : undefined,
            deadlineAt: d.endAt ?? d.startAt ?? undefined,
            status: d.status,
            isExam: !!d.isExam,
            kind: d.isExam ? 'exam' : 'deadline',
          }));

        const now = dayjs();
        const eventItems: NotificationItem[] = (rsEvents || []).map((e) => {
          const start = dayjs(e.start);
          const end = e.end ? dayjs(e.end) : null;

          let status: NotificationItem['status'] = 'upcoming';
          if (end && now.isAfter(end)) {
            status = 'overdue';
          } else if (now.isAfter(start) && (!end || now.isBefore(end))) {
            status = 'ongoing';
          }

          return {
            id: `event-${e._id}`,
            title: e.title,
            time: start.format('DD/MM/YYYY HH:mm'),
            deadlineAt: e.start,
            status,
            isExam: false,
            kind: 'event',
          };
        });

        let list: NotificationItem[] = [...deadlineItems, ...eventItems];
        list = reorderItems(list);

        setAutoItems(list);
        itemsRef.current = list;

        const read = getReadSet();

        const deadlineLike = list.filter(
          (it) => it.kind === 'deadline' || it.kind === 'exam' || !it.kind
        );
        const eventLike = list.filter((it) => it.kind === 'event');

        const newOverdue = deadlineLike.filter(
          (it) => it.status === 'overdue' && !read.has(it.id)
        );
        if (newOverdue.length) {
          addReadIds(newOverdue.map((i) => i.id));
          triggerBellAndPush(undefined, newOverdue.map((i) => i.id));
        }

        const nonOverdueDeadlines = deadlineLike.filter(
          (it) => it.status !== 'overdue'
        );
        if (nonOverdueDeadlines.length > 0) {
          maybeTriggerUpcomingReminders(nonOverdueDeadlines);
        }

        if (eventLike.length > 0) {
          maybeTriggerEventReminders(eventLike);
        }

        const examLike = list.filter((it) => it.kind === 'exam');
        if (examLike.length > 0) {
          maybeTriggerExamDailyReminders(examLike);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const id = setInterval(() => {
      const src = itemsRef.current || autoItems || [];
      if (!src.length) return;

      const deadlineLike = src.filter(
        (it) => (it.kind === 'deadline' || it.kind === 'exam' || !it.kind) && it.status !== 'overdue'
      );
      if (deadlineLike.length) {
        maybeTriggerUpcomingReminders(deadlineLike);
      }

      const eventLike = src.filter((it) => it.kind === 'event');
      if (eventLike.length) {
        maybeTriggerEventReminders(eventLike);
      }

      const examLike = src.filter((it) => it.kind === 'exam');
       if (examLike.length) {
         maybeTriggerExamDailyReminders(examLike);
       }
    }, 60_000);
    return () => clearInterval(id);
  }, [autoItems]);

  useEffect(() => {
    const id = setInterval(() => {
      loadNotifications();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      const src = items && items.length ? items : autoItems || [];
      const overdueIds = src.filter((i) => i.status === 'overdue').map((i) => i.id);
      if (overdueIds.length) {
        addReadIds(overdueIds);
      }
      try {
        localStorage.setItem('notif.deadline.lastShownTs', String(Date.now()));
      } catch {}
      setUnread(false);
    }
    onOpenChange?.(v);
  };

  const mergedItems = useMemo(() => {
    const base = items && items.length ? items : autoItems || [];
    return base.filter((it) => !hidden.has(it.id));
  }, [items, autoItems, hidden]);

  const handleDeleteOne = (id: string) => {
    hideIds([id]);
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    hideIds(ids);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const content = mergedItems.length ? (
    <div className="notif-list-scroll">
      {selectionMode && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            padding: '2px 4px',
          }}
        >
          <Typography.Text style={{ fontSize: 12 }}>
            Đã chọn {selectedIds.size} thông báo
          </Typography.Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="small"
              danger
              disabled={!selectedIds.size}
              onClick={handleDeleteSelected}
            >
              Xóa
            </Button>
            <Button size="small" onClick={handleClearSelection}>
              Hủy
            </Button>
          </div>
        </div>
      )}
      <List
        dataSource={mergedItems}
        split
        renderItem={(it) => {
          const isExam = !!it.isExam;
          const kind = it.kind || (isExam ? 'exam' : 'deadline');
          const status = it.status || 'upcoming';

          let tagColor: string;
          let tagText: string;
          switch (status) {
            case 'overdue':
              tagColor = 'red';
              if (kind === 'event') {
                tagText = 'Sự kiện đã qua';
              } else {
                tagText = isExam ? 'Thi - Quá hạn' : 'Quá hạn';
              }
              break;
            case 'ongoing':
              tagColor = 'orange';
              if (kind === 'event') {
                tagText = 'Đang diễn ra';
              } else {
                tagText = isExam ? 'Thi - Đang tới hạn' : 'Đang tới hạn';
              }
              break;
            default:
              tagColor = 'blue';
              if (kind === 'event') {
                tagText = 'Sắp diễn ra';
              } else {
                tagText = isExam ? 'Lịch thi' : 'Sắp tới';
              }
              break;
          }

          let subText: string | undefined;
          if (it.deadlineAt) {
            const end = dayjs(it.deadlineAt);
            const today = dayjs().startOf('day');
            const diff = end.startOf('day').diff(today, 'day');

            if (status === 'overdue') {
              subText = `Quá hạn từ ${end.format('DD/MM/YYYY HH:mm')}`;
            } else if (diff > 1) {
              subText = `Còn ${diff} ngày (đến ${end.format('DD/MM/YYYY HH:mm')})`;
            } else if (diff === 1) {
              subText = `Còn 1 ngày (đến ${end.format('DD/MM/YYYY HH:mm')})`;
            } else if (diff === 0) {
              if (status === 'ongoing') {
                const timeRemaining = formatTimeRemaining(end);
                subText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')}) - ${timeRemaining}`;
              } else {
                subText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')})`;
              }
            } else {
              subText = it.time
                ? `Hạn: ${end.format('DD/MM/YYYY HH:mm')}`
                : undefined;
            }
          } else if (it.time) {
            subText = `Thời gian: ${it.time}`;
          }

          let prefix = 'Deadline';
          if (kind === 'exam') prefix = 'Lịch thi';
          else if (kind === 'event') prefix = 'Lịch học';

          const { icon, color } = getNotificationIconAndColor(kind, isExam, status);
          const isSelected = selectedIds.has(it.id);

          return (
            <List.Item key={it.id} className="notif-item">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleToggleSelect(it.id)}
                    style={{ marginTop: 4 }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Typography.Text strong ellipsis style={{ maxWidth: 200 }}>
                      <span style={{ marginRight: 4 }}>{icon}</span>
                      {prefix}: {it.title}
                    </Typography.Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag color={tagColor}>{tagText}</Tag>
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'delete', label: 'Xóa thông báo này' },
                            {
                              key: 'select',
                              label: isSelected
                                ? 'Bỏ khỏi danh sách xóa'
                                : 'Chọn để xóa nhiều',
                            },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'delete') {
                              handleDeleteOne(it.id);
                            } else if (key === 'select') {
                              handleToggleSelect(it.id);
                            }
                          },
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          className="notif-more-btn"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </div>
                  </div>
                  {subText ? (
                    <Typography.Text
                      style={{
                        fontSize: 12,
                        color: status === 'overdue' ? '#d63031' : 'rgba(0,0,0,0.6)',
                      }}
                    >
                      {subText}
                    </Typography.Text>
                  ) : null}
                </div>
              </div>
            </List.Item>
          );
        }}
        style={{ minWidth: 280, maxWidth: 360 }}
      />
    </div>
  ) : (
    <div style={{ width: 260 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
    </div>
  );

  const badgeCount = useMemo(() => {
    if (typeof count === 'number') return count;
    const orderMap = getOrderMap();
    const lastShown = getLastShownTs();
    return mergedItems.filter((it) => (orderMap[it.id] ?? 0) > lastShown).length;
  }, [count, mergedItems]);

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


