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

export type NotificationItem = {
  id: string;
  title: string; // Tiêu đề thô (tên deadline / lịch thi)
  time?: string; // Thời gian hiển thị đã format
  deadlineAt?: string; // ISO thời điểm kết thúc để tính toán thêm
  // Loại nguồn: deadline thường, lịch thi, hay sự kiện/lịch học
  kind?: 'deadline' | 'exam' | 'event';
  status?: 'overdue' | 'ongoing' | 'upcoming' | 'completed';
  isExam?: boolean;
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

  // Lưu lại những deadline đã được người dùng "xem rồi" (đã mở popover)
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

  // Lưu stage nhắc nhở cho từng deadline: 'day' | 'hour' | 'minute'
  const getStageMap = (): Record<string, 'day' | 'hour' | 'minute'> => {
    try {
      const raw = localStorage.getItem('notif.deadline.stages');
      if (!raw) return {};
      const obj = JSON.parse(raw) as Record<string, 'day' | 'hour' | 'minute'>;
      return obj || {};
    } catch {
      return {};
    }
  };

  const saveStageMap = (m: Record<string, 'day' | 'hour' | 'minute'>) => {
    try {
      localStorage.setItem('notif.deadline.stages', JSON.stringify(m));
    } catch {}
  };

  // Map lưu ngày cuối cùng đã nhắc mỗi lịch thi (key: id, value: 'YYYY-MM-DD')
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

  // Lưu các event đã được nhắc 30 phút trước giờ bắt đầu
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

  // Lưu thứ tự ưu tiên hiển thị theo lần thông báo gần nhất
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

  // Ẩn (xóa) thông báo khỏi danh sách hiện tại (chỉ local, không đụng DB)
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

  // Helper: bật chuông, mở popover và hiện notification đẩy
  const triggerBellAndPush = (reason?: string, ids?: string[]) => {
    if (ids && ids.length) {
      bumpOrderForIds(ids);
    }
    setUnread(true);
    setOpen(true);

    // Chuẩn bị nội dung hiển thị rõ tên sự kiện / deadline / lịch thi
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
          messageText = `${prefix} mới: ${it.title}`;

          // Nếu có thời điểm kết thúc/bắt đầu, mô tả theo kiểu "Còn X ngày ..."
          if (it.deadlineAt) {
            const end = dayjs(it.deadlineAt);
            const today = dayjs().startOf('day');
            const diff = end.startOf('day').diff(today, 'day');

            if (diff > 1) {
              descriptionText = `Còn ${diff} ngày (đến ${end.format('DD/MM/YYYY HH:mm')}).`;
            } else if (diff === 1) {
              descriptionText = `Còn 1 ngày (đến ${end.format('DD/MM/YYYY HH:mm')}).`;
            } else if (diff === 0) {
              descriptionText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')}).`;
            } else if (it.time) {
              descriptionText = `${prefix} diễn ra lúc ${it.time}.`;
            } else {
              descriptionText = `${prefix} mới được cập nhật.`;
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
            return `• ${prefix}: ${it.title}`;
          });
          if (related.length > 3) {
            lines.push(`… và ${related.length - 3} thông báo khác`);
          }
          descriptionText = lines.join('\n');
        }
      } else if (reason) {
        // Không tìm thấy item cụ thể, fallback dùng reason
        descriptionText = reason;
      }
    }

    try {
      notification.open({
        message: messageText,
        description: descriptionText,
        placement: 'bottomRight',
        duration: 0, // 0 = chỉ tắt khi người dùng tự đóng
      });
    } catch {
      // ignore
    }
  };

  const maybeTriggerUpcomingReminders = (list: NotificationItem[]) => {
    const stageMap = getStageMap();
    let shouldNotify = false;
    const triggeredIds: string[] = [];

    const now = dayjs();

    list.forEach((it) => {
      // Chỉ áp dụng cho deadline / lịch thi, không áp dụng cho sự kiện
      if (it.kind === 'event') return;
      if (!it.deadlineAt) return;
      if (it.status === 'overdue') return;

      const end = dayjs(it.deadlineAt);
      const diffMinutes = end.diff(now, 'minute');
      if (diffMinutes <= 0) return; // đã tới hạn hoặc quá hạn, sẽ được xử lý ở nhánh khác

      let stage: 'day' | 'hour' | 'minute' | null = null;
      if (diffMinutes <= 5) {
        stage = 'minute';
      } else if (diffMinutes <= 60) {
        stage = 'hour';
      } else if (diffMinutes <= 1440) {
        stage = 'day';
      }

      if (!stage) return;

      const prev = stageMap[it.id];
      const order = { day: 1, hour: 2, minute: 3 } as const;
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

  // Nhắc cho các sự kiện / lịch học: 30 phút trước giờ bắt đầu
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

      // Chỉ nhắc trong khoảng từ 0 → 30 phút trước giờ bắt đầu, và mỗi event chỉ nhắc 1 lần
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

  // Lịch thi: nhắc mỗi ngày một lần với thông điệp "Còn X ngày..."
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
      // Bỏ qua nếu đã thi xong
      if (end.isBefore(now, 'day')) return;

      // Chỉ nhắc daily khi còn ít nhất 1 ngày (diffDays > 0).
      // Khi bước vào ngày thi (diffDays <= 0) thì dùng rule "1 ngày / 1 giờ / 5 phút"
      // để tránh trùng popup.
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
        // 1) Map deadlines (bao gồm cả lịch thi)
        const deadlineItems: NotificationItem[] = rsDeadlines
          // include overdue + ongoing + upcoming, exclude completed
          .filter((d) => d.status !== 'completed')
          // newest first (desc by endAt/createdAt)
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

        // 2) Map calendar events (lịch học / sự kiện cá nhân)
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
            deadlineAt: e.start, // dùng giờ bắt đầu để tính nhắc nhở
            status,
            isExam: false,
            kind: 'event',
          };
        });

        // Trộn deadline / lịch thi / sự kiện
        let list: NotificationItem[] = [...deadlineItems, ...eventItems];

        // Sắp xếp theo lần thông báo gần nhất:
        // - Cái nào vừa được "ping" gần đây sẽ nhảy lên trên cùng.
        // - Nếu chưa từng được thông báo, fallback theo thời gian đến hạn/bắt đầu (gần tới trước).
        const orderMap = getOrderMap();
        list = list.sort((a, b) => {
          const oa = orderMap[a.id] ?? 0;
          const ob = orderMap[b.id] ?? 0;
          if (oa !== ob) return ob - oa; // lớn hơn (mới hơn) lên đầu

          const ta = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
          const tb = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
          return ta - tb;
        });

        setAutoItems(list);
        itemsRef.current = list;

        const read = getReadSet();

        // Chia riêng deadline/lịch thi và sự kiện
        const deadlineLike = list.filter(
          (it) => it.kind === 'deadline' || it.kind === 'exam' || !it.kind
        );
        const eventLike = list.filter((it) => it.kind === 'event');

        // 1) Overdue deadline: chỉ notify cho item chưa được đọc
        const newOverdue = deadlineLike.filter(
          (it) => it.status === 'overdue' && !read.has(it.id)
        );
        if (newOverdue.length) {
          addReadIds(newOverdue.map((i) => i.id));
          triggerBellAndPush(undefined, newOverdue.map((i) => i.id));
        }

        // 2) Deadline / lịch thi chưa quá hạn: nhắc theo mốc thời gian (còn 1 ngày, 1 tiếng, 5 phút)
        const nonOverdueDeadlines = deadlineLike.filter(
          (it) => it.status !== 'overdue'
        );
        if (nonOverdueDeadlines.length > 0) {
          maybeTriggerUpcomingReminders(nonOverdueDeadlines);
        }

        // 3) Lịch học / sự kiện: nhắc 30 phút trước giờ bắt đầu
        if (eventLike.length > 0) {
          maybeTriggerEventReminders(eventLike);
        }

        // 4) Lịch thi: nhắc mỗi ngày một lần
        const examLike = list.filter((it) => it.kind === 'exam');
        if (examLike.length > 0) {
          maybeTriggerExamDailyReminders(examLike);
        }
      })
      .catch(() => {});
  }, []);

  // Load lần đầu khi component mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Ticker: kiểm tra định kỳ (mỗi phút) để bắt các mốc còn 1 ngày / 1 tiếng / 5 phút
  useEffect(() => {
    const id = setInterval(() => {
      const src = itemsRef.current || autoItems || [];
      if (!src.length) return;

      // Chỉ xét các deadline còn hạn (upcoming/ongoing), bất kể đã mở popover trước đó hay chưa.
      const deadlineLike = src.filter(
        (it) => (it.kind === 'deadline' || it.kind === 'exam' || !it.kind) && it.status !== 'overdue'
      );
      if (deadlineLike.length) {
        maybeTriggerUpcomingReminders(deadlineLike);
      }

      // Và các sự kiện / lịch học để nhắc 30 phút trước giờ bắt đầu
      const eventLike = src.filter((it) => it.kind === 'event');
      if (eventLike.length) {
        maybeTriggerEventReminders(eventLike);
      }

       // Lịch thi: nhắc lại mỗi ngày một lần
       const examLike = src.filter((it) => it.kind === 'exam');
       if (examLike.length) {
         maybeTriggerExamDailyReminders(examLike);
       }
    }, 60_000);
    return () => clearInterval(id);
  }, [autoItems]);

  // Poll backend định kỳ để lấy các deadline / lịch học mới tạo trong lúc user đang dùng
  useEffect(() => {
    const id = setInterval(() => {
      loadNotifications();
    }, 60_000); // mỗi 60 giây gọi API lại một lần
    return () => clearInterval(id);
  }, [loadNotifications]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      // Khi user mở popover, coi như đã "đọc" tất cả các thông báo hiện tại
      const src = items && items.length ? items : autoItems || [];
      // Nhưng chỉ đánh dấu "đã đọc" cho các thông báo đã quá hạn (overdue),
      // để tránh spam lại cùng một thông báo quá hạn.
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
    // Ẩn các item đã bị user xóa khỏi thông báo
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
    // Giới hạn chiều cao ~5 item, có scroll để xem thông báo cũ hơn
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

          // Dòng mô tả phụ: đếm ngược ngày nếu có deadlineAt
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
              subText = `Hôm nay đến hạn (${end.format('DD/MM/YYYY HH:mm')})`;
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

  // Số thông báo "chưa đọc": những item có thời điểm thông báo mới nhất > lần cuối user mở popover
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


