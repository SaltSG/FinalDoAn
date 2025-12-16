import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrapPlugin from '@fullcalendar/bootstrap';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  DatePicker,
  Space,
  message,
  ColorPicker,
  Select,
  TimePicker,
  Row,
  Col,
  Popconfirm,
  Dropdown,
  Tooltip,
  Popover,
  Radio,
} from 'antd';
import { LeftOutlined, RightOutlined, CheckOutlined, SettingOutlined } from '@ant-design/icons';
import viLocale from '@fullcalendar/core/locales/vi';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
  CalendarEventDto,
} from '../services/events';
import {
  fetchDeadlines,
  DeadlineDto,
  createDeadline as apiCreateDeadline,
  updateDeadline as apiUpdateDeadline,
  deleteDeadline as apiDeleteDeadline,
} from '../services/deadlines';
import { fetchCurriculum, type CurriculumCourse } from '../services/curriculum';
import { fetchResultsMeta } from '../services/results';
import { getAuthUser } from '../services/auth';
import { getNotificationIconAndColor } from '../components/NotificationBell';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

type DeadlineStatus = 'upcoming' | 'ongoing' | 'overdue' | 'completed';


const computeDeadlineStatus = (
  status: string | undefined,
  startAt: string | null | undefined,
  endAt: string | null | undefined
): DeadlineStatus => {
  if (status === 'upcoming' || status === 'ongoing' || status === 'overdue' || status === 'completed') {
    return status;
  }

 
  const now = dayjs();
  const start = startAt ? dayjs(startAt) : null;
  const end = endAt ? dayjs(endAt) : null;

  if (end && now.isAfter(end)) return 'overdue';
  if (start && end && now.isAfter(start) && now.isBefore(end)) return 'ongoing';
  return 'upcoming';
};


const getStatusColor = (status: DeadlineStatus): string => {
  switch (status) {
    case 'upcoming':
      return '#f97316'; // Orange
    case 'ongoing':
      return '#22c55e'; // Green
    case 'overdue':
      return '#ef4444'; // Red
    case 'completed':
      return '#9ca3af'; // Gray
    default:
      return '#1a73e8'; // Default blue
  }
};

export default function CalendarPage() {
  dayjs.locale('vi');
  const user = getAuthUser();

  // State
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineDto[]>([]);
  // Bộ lọc hiển thị trên lịch
  const [showEvents, setShowEvents] = useState<boolean>(true);
  const [showDeadlines, setShowDeadlines] = useState<boolean>(true);
  const [showExams, setShowExams] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventDto | null>(null);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineDto | null>(null);
  const [editingScope, setEditingScope] = useState<'single' | 'series'>('single');
  const [form] = Form.useForm();
  const [deadlineForm] = Form.useForm();
  // Flag riêng để biết đây là deadline thường hay lịch thi, không cho user tick lại
  const [deadlineIsExam, setDeadlineIsExam] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [examCourses, setExamCourses] = useState<CurriculumCourse[]>([]);
  const [selectedExamCourse, setSelectedExamCourse] = useState<CurriculumCourse | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  // Remember last selected view; default to week view
  const initialView = useMemo(() => {
    try {
      const saved = localStorage.getItem('calendar.initialView');
      return saved || 'timeGridWeek';
    } catch {
      return 'timeGridWeek';
    }
  }, []);
  const [view, setView] = useState<string>(initialView);

  const colorPresets = [
    {
      label: 'Màu cơ bản',
      colors: [
        '#ef4444', // Đỏ
        '#f97316', // Cam
        '#eab308', // Vàng
        '#14b8a6', // Xanh lá nhạt
        '#22c55e', // Xanh lá đậm
        '#3b82f6', // Xanh dương nhạt
        '#1e40af', // Xanh dương đậm
        '#a855f7', // Tím nhạt
        '#9333ea', // Tím đậm
        '#6b7280', // Xám
        '#1a73e8', 
      ],
    },
  ];

  // Load danh sách môn học trong chương trình đào tạo để dùng cho Lịch thi
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;

    (async () => {
      try {
        
        const meta = await fetchResultsMeta(u.id);
        let spec: 'dev' | 'design' = 'dev';
        if (meta.specialization === 'design' || meta.specialization === 'dev') {
          spec = meta.specialization;
        }

        const cur = await fetchCurriculum(spec);
        const allCourses: CurriculumCourse[] = [];
        for (const sem of cur.semesters || []) {
          for (const c of sem.courses || []) {
            allCourses.push(c);
          }
        }
        setExamCourses(allCourses);
      } catch {
        setExamCourses([]);
      }
    })();
  }, []);

  const renderDayHeader = useCallback((arg: any) => {
    const d = dayjs(arg.date);
    const isToday = d.isSame(dayjs(), 'day');
    const dow = d.format('dd').toUpperCase(); // CN, T2, T3...
    const date = d.format('D');
    return {
      html: `<div class="fc-dayhead">
        <span class="fc-dow">${dow}</span>
        <span class="fc-date${isToday ? ' today' : ''}">${date}</span>
      </div>`,
    };
  }, []);

  const mapped: EventInput[] = useMemo(() => {
    // Map calendar events
    const calendarEvents: EventInput[] = events.map((e) => {
      const { icon } = getNotificationIconAndColor('event', false, 'upcoming');
      return {
        id: `event-${e._id}`,
        title: `${icon} ${e.title}`,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        backgroundColor: e.color || '#3b82f6', // Màu xanh mặc định cho lịch học
        borderColor: e.color || '#3b82f6',
        extendedProps: { type: 'event', seriesId: e.seriesId },
      };
    });

    // Map deadline events (chỉ deadline thường, không bao gồm lịch thi)
    const normalDeadlineEvents: EventInput[] = deadlines
      .filter((d) => {
        const isExam = !!(d as any).isExam;
        if (isExam) return false;
        // Only show deadlines that have endAt or startAt
        if (!d.endAt && !d.startAt) return false;

        // Compute effective status to check if overdue
        const effectiveStatus = computeDeadlineStatus(d.status, d.startAt, d.endAt);

        // Hide overdue deadlines
        if (effectiveStatus === 'overdue') return false;
        return true;
      })
      .map((d) => {
        // For deadlines, always use the date part only (set to start of day) for all-day display
        const startDate = d.startAt
          ? dayjs(d.startAt).startOf('day')
          : d.endAt
            ? dayjs(d.endAt).startOf('day')
            : null;
        const endDate = d.endAt ? dayjs(d.endAt).startOf('day') : null;

        // Compute effective status
        const effectiveStatus = computeDeadlineStatus(
          d.status,
          d.startAt,
          d.endAt
        );

        const { icon, color } = getNotificationIconAndColor('deadline', false, effectiveStatus);

        return {
          id: `deadline-${d._id}`,
          title: `${icon} ${d.title}`,
          start: startDate?.toISOString(),
          end: endDate
            ? endDate.add(1, 'day').toISOString()
            : startDate
              ? startDate.add(1, 'day').toISOString()
              : undefined,
          allDay: true, // Always all-day for deadlines
          backgroundColor: color,
          borderColor: color,
          textColor: effectiveStatus === 'completed' ? '#6b7280' : '#ffffff',
          editable: false, // Deadlines cannot be dragged or resized
          extendedProps: {
            type: 'deadline',
            deadlineId: d._id,
            status: d.status,
            isExam: false,
          },
          classNames: effectiveStatus === 'completed'
            ? ['deadline-completed']
            : [],
        };
      });

    // Lịch thi: luôn hiển thị trên lịch, không phụ thuộc công tắc "Hiện Deadline"
    // Lịch thi quá hạn vẫn hiển thị (không ẩn như deadline thường)
    const examEvents: EventInput[] = deadlines
      .filter((d) => {
        const isExam = !!(d as any).isExam;
        if (!isExam) return false;
        if (!d.endAt && !d.startAt) return false;
        // Lịch thi quá hạn vẫn hiển thị, không filter ra
        return true;
      })
      .map((d) => {
        // Với lịch thi, giữ nguyên giờ thi 
        const startDateTime = d.startAt
          ? dayjs(d.startAt)
          : d.endAt
            ? dayjs(d.endAt)
            : null;
        const endDateTime = d.endAt ? dayjs(d.endAt) : startDateTime;

        const effectiveStatus = computeDeadlineStatus(
          d.status,
          d.startAt,
          d.endAt
        );

        const { icon, color } = getNotificationIconAndColor('exam', true, effectiveStatus);

        return {
          id: `deadline-${d._id}`,
          title: `${icon} ${d.title}`,
          start: startDateTime?.toISOString(),
          end: endDateTime?.toISOString(),
          allDay: false,
          backgroundColor: color,
          borderColor: color,
          textColor: effectiveStatus === 'completed' ? '#e5e7eb' : '#ffffff',
          editable: false,
          extendedProps: {
            type: 'deadline',
            deadlineId: d._id,
            status: d.status,
            isExam: true,
          },
          classNames:
            effectiveStatus === 'completed'
              ? ['deadline-completed', 'deadline-exam']
              : ['deadline-exam'],
        };
      });

    const visibleEvents = showEvents ? calendarEvents : [];
    const visibleDeadlines = showDeadlines ? normalDeadlineEvents : [];
    const visibleExams = showExams ? examEvents : [];

    return [...visibleEvents, ...visibleDeadlines, ...visibleExams];
  }, [events, deadlines, showEvents, showDeadlines, showExams]);

  const loadRange = useCallback(
    async (startIso: string, endIso: string) => {
      setLoading(true);
      try {
        const [eventsData, deadlinesData] = await Promise.all([
          fetchEvents({ start: startIso, end: endIso }),
          user?.id ? fetchDeadlines(user.id) : Promise.resolve([]),
        ]);
        setEvents(eventsData);
        setDeadlines(deadlinesData);
      } catch (err: any) {
        message.error('Không tải được dữ liệu');
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const onDatesSet = useCallback(
    (arg: any) => {
      const start = arg.view.currentStart.toISOString();
      const end = arg.view.currentEnd.toISOString();
      // Persist last selected view
      try {
        localStorage.setItem('calendar.initialView', arg.view.type);
      } catch {}
      setView(arg.view.type);
      setCurrentTitle(arg.view.title || '');
      loadRange(start, end);
    },
    [loadRange]
  );

  const openCreate = useCallback(
    (selection: DateSelectArg) => {
      setEditing(null);
      form.setFieldsValue({
        title: '',
        allDay: selection.allDay,
        time: [dayjs(selection.start), dayjs(selection.end ?? selection.start)],
        description: '',
        color: '#1a73e8', 
      });
      setModalOpen(true);
    },
    [form]
  );

  const openEdit = useCallback(
    (arg: EventClickArg) => {
      const eventType = arg.event.extendedProps?.type;
      const deadlineId = arg.event.extendedProps?.deadlineId;

      // If it's a deadline, open deadline modal
      if (eventType === 'deadline' && deadlineId) {
        const found = deadlines.find((d) => d._id === deadlineId);
        if (!found) return;
        setEditingDeadline(found);
        setDeadlineIsExam(!!found.isExam);
      
        if (found.isExam && found.courseCode && examCourses.length) {
          const match = examCourses.find((c) => c.code === found.courseCode);
          setSelectedExamCourse(match || null);
        } else {
          setSelectedExamCourse(null);
        }
        deadlineForm.setFieldsValue({
          title: found.title,
          startDate: found.startAt ? dayjs(found.startAt) : undefined,
          startTime: found.startAt ? dayjs(found.startAt) : undefined,
          endDate: found.endAt ? dayjs(found.endAt) : undefined,
          endTime: found.endAt ? dayjs(found.endAt) : undefined,
          note: found.note || '',
        });
        setDeadlineModalOpen(true);
        return;
      }

      // Otherwise, it's a calendar event
      const eventId = arg.event.id.replace('event-', '');
      const found = events.find((e) => e._id === eventId);
      if (!found) return;
      setEditing(found);
      setEditingScope('single');
      form.setFieldsValue({
        title: found.title,
        allDay: found.allDay,
        time: [dayjs(found.start), dayjs(found.end ?? found.start)],
        description: found.description || '',
        color: found.color || '#1a73e8',
      });
      setModalOpen(true);
    },
    [events, deadlines, form, deadlineForm]
  );

  const handleDrop = useCallback(async (arg: EventDropArg) => {
    // Don't allow dragging deadlines
    if (arg.event.extendedProps?.type === 'deadline') {
      arg.revert();
      message.warning('Không thể di chuyển deadline. Click vào deadline để chỉnh sửa.');
      return;
    }

    try {
      const eventId = arg.event.id.replace('event-', '');
      await updateEvent(eventId, {
        start: arg.event.start?.toISOString(),
        end: arg.event.end?.toISOString(),
        allDay: !!arg.event.allDay,
      });
      setEvents((list) =>
        list.map((e) =>
          e._id === eventId
            ? {
                ...e,
                start: arg.event.start!.toISOString(),
                end: arg.event.end?.toISOString(),
                allDay: !!arg.event.allDay,
              }
            : e
        )
      );
    } catch {
      message.error('Không thể cập nhật sự kiện');
      arg.revert();
    }
  }, []);

  const handleResize = useCallback(async (arg: any) => {
    // Don't allow resizing deadlines
    if (arg.event.extendedProps?.type === 'deadline') {
      arg.revert();
      message.warning('Không thể thay đổi thời gian deadline. Click vào deadline để chỉnh sửa.');
      return;
    }

    try {
      const eventId = arg.event.id.replace('event-', '');
      await updateEvent(eventId, {
        start: arg.event.start?.toISOString(),
        end: arg.event.end?.toISOString(),
        allDay: !!arg.event.allDay,
      });
      setEvents((list) =>
        list.map((e) =>
          e._id === eventId
            ? {
                ...e,
                start: arg.event.start!.toISOString(),
                end: arg.event.end?.toISOString(),
                allDay: !!arg.event.allDay,
              }
            : e
        )
      );
    } catch {
      message.error('Không thể cập nhật sự kiện');
      arg.revert();
    }
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      const vals = await form.validateFields();
      const [start, end] = vals.time || [];
      const colorValue =
        typeof vals.color === 'string'
          ? vals.color
          : vals.color?.toHexString?.() || '#1a73e8';

      const baseTitle = String(vals.title || '').trim();
      const baseDesc = String(vals.description || '').trim() || undefined;
      const allDay = !!vals.allDay;

      if (editing) {
        const payload = {
          title: baseTitle,
          description: baseDesc,
          allDay,
          start: start?.toISOString(),
          end: end?.toISOString(),
          color: colorValue,
        };
        const updated = await updateEvent(editing._id, payload);
        setEvents((list) => list.map((e) => (e._id === editing._id ? updated : e)));
      } else {
        // Tạo mới: hỗ trợ lặp hàng tuần trong N tuần tới (đơn giản)
        const repeatMode = vals.repeatMode || 'none';
        let repeatCount = Number(vals.repeatCount || 1);
        if (!Number.isFinite(repeatCount) || repeatCount < 1) repeatCount = 1;
        repeatCount = Math.min(repeatCount, 30); // tránh tạo quá nhiều

        const createdEvents: CalendarEventDto[] = [];
        const seriesId =
          repeatMode === 'weekly'
            ? `series_${Date.now().toString()}_${Math.random().toString(36).slice(2, 8)}`
            : undefined;

        if (!start) throw new Error('missing_start');

        for (let i = 0; i < (repeatMode === 'weekly' ? repeatCount : 1); i += 1) {
          const startShifted = i === 0 ? start : (start as dayjs.Dayjs).add(i, 'week');
          const endShifted =
            end && (i === 0 ? end : (end as dayjs.Dayjs).add(i, 'week'));

          const payload = {
            title: baseTitle,
            description: baseDesc,
            allDay,
            start: startShifted.toISOString(),
            end: endShifted?.toISOString(),
            color: colorValue,
            seriesId,
          };

          // eslint-disable-next-line no-await-in-loop
          const created = await createEvent(payload);
          createdEvents.push(created);
        }

        setEvents((list) => [...list, ...createdEvents]);
      }

      setModalOpen(false);
      setEditing(null);
      message.success(editing ? 'Đã cập nhật sự kiện' : 'Đã tạo sự kiện');
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      message.error('Lưu sự kiện thất bại');
    }
  }, [editing, form]);

  const onSubmitSeries = useCallback(async () => {
    if (!editing?.seriesId) return;
    try {
      const vals = await form.validateFields();
      const [start, end] = vals.time || [];
      const colorValue =
        typeof vals.color === 'string'
          ? vals.color
          : vals.color?.toHexString?.() || '#1a73e8';

      const baseTitle = String(vals.title || '').trim();
      const baseDesc = String(vals.description || '').trim() || undefined;
      const allDay = !!vals.allDay;

      const all = await fetchEvents();
      const related = all
        .filter((e) => e.seriesId === editing.seriesId)
        .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
      if (!related.length) return;

      const baseStartOrig = dayjs(related[0].start);

      await Promise.all(
        related.map((ev) => {
          const evStart = dayjs(ev.start);
          const weeksOffset = evStart.diff(baseStartOrig, 'week');

          const newStart =
            start && dayjs(start).add(weeksOffset, 'week');
          const newEnd =
            end && dayjs(end).add(weeksOffset, 'week');

          const payload = {
            title: baseTitle,
            description: baseDesc,
            allDay,
            start: newStart?.toISOString(),
            end: newEnd?.toISOString(),
            color: colorValue,
          };
          return updateEvent(ev._id, payload);
        })
      );

      // Cập nhật lại state hiện tại (chỉ các event đã load)
      setEvents((list) =>
        list.map((e) => {
          if (e.seriesId !== editing.seriesId) return e;
          const evStart = dayjs(e.start);
          const baseStart = baseStartOrig;
          const weeksOffset = evStart.diff(baseStart, 'week');
          const newStart =
            start && dayjs(start).add(weeksOffset, 'week');
          const newEnd =
            end && dayjs(end).add(weeksOffset, 'week');
          return {
            ...e,
            title: baseTitle,
            description: baseDesc,
            allDay,
            start: newStart ? newStart.toISOString() : e.start,
            end: newEnd ? newEnd.toISOString() : e.end,
            color: colorValue,
          };
        })
      );

      setModalOpen(false);
      setEditing(null);
      message.success('Đã cập nhật toàn bộ chuỗi sự kiện');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Lưu chuỗi sự kiện thất bại');
    }
  }, [editing, form]);

  const onDelete = useCallback(async () => {
    if (!editing) return;
    try {
      await deleteEvent(editing._id);
      setEvents((list) => list.filter((e) => e._id !== editing._id));
      setModalOpen(false);
      setEditing(null);
      message.success('Đã xóa sự kiện');
    } catch {
      message.error('Xóa sự kiện thất bại');
    }
  }, [editing]);

  const onDeleteSeries = useCallback(async () => {
    if (!editing?.seriesId) return;
    try {
      // Lấy toàn bộ event của user, lọc theo seriesId
      const all = await fetchEvents();
      const related = all.filter((e) => e.seriesId === editing.seriesId);
      await Promise.all(related.map((ev) => deleteEvent(ev._id)));
      setEvents((list) => list.filter((e) => e.seriesId !== editing.seriesId));
      setModalOpen(false);
      setEditing(null);
      message.success('Đã xóa toàn bộ chuỗi sự kiện');
    } catch {
      message.error('Xóa chuỗi sự kiện thất bại');
    }
  }, [editing]);

  const mergeDateTime = useCallback(
    (date?: dayjs.Dayjs, time?: dayjs.Dayjs): Date | null => {
      if (!date) return null;
      if (time) {
        return date
          .hour(time.hour())
          .minute(time.minute())
          .second(0)
          .millisecond(0)
          .toDate();
      }
      return date.startOf('day').toDate();
    },
    []
  );

  const onDeadlineSubmit = useCallback(async () => {
    if (!user?.id) return;
    try {
      const vals = await deadlineForm.validateFields();
      const start = mergeDateTime(vals.startDate, vals.startTime);
      const end = mergeDateTime(vals.endDate, vals.endTime);

      const payload = {
        title: String(vals.title || '').trim(),
        startAt: start?.toISOString() ?? null,
        endAt: end?.toISOString() ?? null,
        note: String(vals.note || '').trim() || undefined,
        isExam: deadlineIsExam,
        courseCode: deadlineIsExam && selectedExamCourse ? selectedExamCourse.code : undefined,
      };

      let result: DeadlineDto;
      if (editingDeadline) {
        result = await apiUpdateDeadline(user.id, editingDeadline._id, payload);
        setDeadlines((list) =>
          list.map((d) => (d._id === editingDeadline._id ? result : d))
        );
      } else {
        result = await apiCreateDeadline(user.id, payload);
        setDeadlines((list) => [...list, result]);
      }

      setDeadlineModalOpen(false);
      setEditingDeadline(null);
      const wasExam = deadlineIsExam;
      setDeadlineIsExam(false);
      deadlineForm.resetFields();
      if (wasExam) {
        message.success(editingDeadline ? 'Đã cập nhật lịch thi' : 'Đã tạo lịch thi');
      } else {
        message.success(editingDeadline ? 'Đã cập nhật deadline' : 'Đã tạo deadline');
      }
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      const errorMsg = deadlineIsExam ? 'Cập nhật lịch thi thất bại' : 'Cập nhật deadline thất bại';
      message.error(errorMsg);
    }
  }, [editingDeadline, deadlineForm, user?.id, mergeDateTime, deadlineIsExam, selectedExamCourse]);

  // Core helper: toggle completed status for bất kỳ deadline nào (dùng chung cho modal + click nhanh trên lịch)
  const toggleDeadlineCompleted = useCallback(
    async (target: DeadlineDto) => {
      if (!user?.id) return;
      try {
        const newStatus =
          target.status === 'completed' ? null : ('completed' as const);

        await apiUpdateDeadline(user.id, target._id, {
          status: newStatus as any, // Backend accepts null to unmark completed
        });

        // Reload toàn bộ deadline để đồng bộ status với backend
        const refreshedDeadlines = await fetchDeadlines(user.id);
        setDeadlines(refreshedDeadlines);

        // Nếu đang mở modal của chính deadline này thì cập nhật lại
        const refreshed = refreshedDeadlines.find((d) => d._id === target._id);
        if (refreshed) {
          setEditingDeadline((prev) => (prev && prev._id === target._id ? refreshed : prev));
        }

        message.success(
          newStatus === 'completed'
            ? 'Đã đánh dấu hoàn thành'
            : 'Đã đổi thành chưa hoàn thành'
        );
      } catch {
        message.error('Cập nhật deadline thất bại');
      }
    },
    [user?.id]
  );

  const onDeadlineToggleComplete = useCallback(async () => {
    if (!editingDeadline) return;
    await toggleDeadlineCompleted(editingDeadline);
  }, [editingDeadline, toggleDeadlineCompleted]);

  const onDeadlineDelete = useCallback(async () => {
    if (!editingDeadline || !user?.id) return;
    try {
      await apiDeleteDeadline(user.id, editingDeadline._id);
      setDeadlines((list) => list.filter((d) => d._id !== editingDeadline._id));
      setDeadlineModalOpen(false);
      setEditingDeadline(null);
      deadlineForm.resetFields();
      message.success('Đã xóa thành công');
    } catch {
      message.error('Xóa deadline thất bại');
    }
  }, [editingDeadline, user?.id, deadlineForm]);

  const handleCloseEventModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setEditingScope('single');
    form.resetFields();
  }, [form]);

  const handleCloseDeadlineModal = useCallback(() => {
    setDeadlineModalOpen(false);
    setEditingDeadline(null);
    setDeadlineIsExam(false);
    deadlineForm.resetFields();
  }, [deadlineForm]);

  // Click nhanh trên calendar để đánh dấu hoàn thành cho deadline (không cần mở modal)
  const handleDeadlineQuickToggle = useCallback(
    async (deadlineId: string) => {
      const target = deadlines.find((d) => d._id === deadlineId);
      if (!target) return;
      await toggleDeadlineCompleted(target);
    },
    [deadlines, toggleDeadlineCompleted]
  );

  // Tạo nhanh sự kiện (lịch học / sự kiện cá nhân) từ nút "Thêm lịch"
  const openCreateEventFromButton = useCallback(() => {
    setEditing(null);
    form.setFieldsValue({
      title: '',
      allDay: false,
      time: [dayjs(), dayjs().add(1, 'hour')],
      description: '',
      color: '#1a73e8',
    });
    setModalOpen(true);
  }, [form]);

  // Tạo nhanh deadline / lịch thi từ nút "Thêm lịch"
  const openCreateDeadlineFromButton = useCallback(
    (presetExam: boolean) => {
      setEditingDeadline(null);
      setDeadlineIsExam(presetExam);
      setSelectedExamCourse(null);
      deadlineForm.setFieldsValue({
        title: '',
        startDate: dayjs(),
        startTime: undefined,
        endDate: dayjs(),
        endTime: undefined,
        note: '',
      });
      setDeadlineModalOpen(true);
    },
    [deadlineForm]
  );

  const handleCreateMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'event') {
        openCreateEventFromButton();
      } else if (key === 'exam') {
        openCreateDeadlineFromButton(true);
      }
    },
    [openCreateEventFromButton, openCreateDeadlineFromButton]
  );

  // Tuỳ biến nội dung event để thêm nút ✓ cho deadline thường (đánh dấu hoàn thành nhanh)
  const renderEventContent = useCallback(
    (arg: EventContentArg) => {
      const ext: any = arg.event.extendedProps || {};
      const isDeadline = ext.type === 'deadline' && !ext.isExam;
      const deadlineId = ext.deadlineId as string | undefined;
      const status = ext.status as DeadlineStatus | undefined;
      const isMonthView = arg.view.type === 'dayGridMonth';

      
      if (isMonthView && (!isDeadline || !deadlineId)) {
        const color = arg.event.backgroundColor || arg.event.borderColor || '#1a73e8';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '12px', lineHeight: '1.3' }}>
              {arg.event.title}
              {arg.timeText && (
                <span style={{ marginLeft: '6px', opacity: 0.8 }}>{arg.timeText}</span>
              )}
            </span>
          </div>
        );
      }

      if (!isDeadline || !deadlineId) {
        return (
          <div
            className="fc-event-inner-custom"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span className="fc-event-title-main">{arg.event.title}</span>
            {arg.timeText && (
              <span
                className="fc-event-time-sub"
                style={{ opacity: 0.9, fontSize: 11 }}
              >
                {arg.timeText}
              </span>
            )}
          </div>
        );
      }

      // Deadline thường: thêm nút ✓ 
      const isCompleted = status === 'completed';

      return (
        <div className="fc-deadline-inner">
          <span className="fc-deadline-title">{arg.event.title}</span>
          <button
            type="button"
            className={`fc-deadline-check${isCompleted ? ' is-completed' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeadlineQuickToggle(deadlineId);
            }}
          >
            <CheckOutlined />
          </button>
        </div>
      );
    },
    [handleDeadlineQuickToggle]
  );

  return (
    <div className="container" style={{ padding: 10 }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Space size={10}>
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Space size={6}>
                    <Switch
                      size="small"
                      checked={showEvents}
                      onChange={setShowEvents}
                    />
                    <span style={{ fontSize: 12 }}>Lịch học / sự kiện</span>
                  </Space>
                  <Space size={6}>
                    <Switch
                      size="small"
                      checked={showDeadlines}
                      onChange={setShowDeadlines}
                    />
                    <span style={{ fontSize: 12 }}>Deadline</span>
                  </Space>
                  <Space size={6}>
                    <Switch
                      size="small"
                      checked={showExams}
                      onChange={setShowExams}
                    />
                    <span style={{ fontSize: 12 }}>Lịch thi</span>
                  </Space>
                </div>
              }
            >
              <Button size="small" icon={<SettingOutlined />}>Hiển thị</Button>
            </Popover>
            <Button
              size="small"
              icon={<LeftOutlined />}
              onClick={() => {
                const api = (calendarRef.current as any)?.getApi?.();
                api?.prev();
              }}
            />
            <Button
              size="small"
              icon={<RightOutlined />}
              onClick={() => {
                const api = (calendarRef.current as any)?.getApi?.();
                api?.next();
              }}
            />
            <Button
              size="small"
              onClick={() => {
                const api = (calendarRef.current as any)?.getApi?.();
                api?.today();
              }}
            >
              Hôm nay
            </Button>
          </Space>

          <div
            style={{
              fontWeight: 800,
              color: 'var(--color-secondary)',
              fontSize: 18,
            }}
          >
            {currentTitle || 'Lịch học'}
          </div>

          <div className="calendar-view-selector">
            <Select
              size="middle"
              value={view}
              style={{ width: 140 }}
              onChange={(v) => {
                setView(v);
                try {
                  localStorage.setItem('calendar.initialView', v);
                } catch {}
                const api = (calendarRef.current as any)?.getApi?.();
                if (api) api.changeView(v);
              }}
              options={[
                { value: 'dayGridMonth', label: 'Tháng' },
                { value: 'timeGridWeek', label: 'Tuần' },
                { value: 'timeGridDay', label: 'Ngày' },
              ]}
            />

            <Dropdown
              menu={{
                items: [
                  { key: 'event', label: 'Thêm sự kiện / lịch học' },
                  { key: 'exam', label: 'Thêm lịch thi' },
                ],
                onClick: handleCreateMenuClick,
              }}
            >
              <Button type="primary">
                Thêm lịch
              </Button>
            </Dropdown>
          </div>
        </div>

        <FullCalendar
          ref={calendarRef as any}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            bootstrapPlugin,
          ]}
          themeSystem="bootstrap5"
          locale={viLocale}
          nowIndicator
          navLinks
          dayMaxEvents
          dayHeaderContent={renderDayHeader}
          headerToolbar={false}
          initialView={initialView}
          selectable
          editable
          events={mapped}
          datesSet={onDatesSet}
          select={openCreate}
          eventClick={openEdit}
          eventDrop={handleDrop}
          eventResize={handleResize}
          eventContent={renderEventContent}
          eventDidMount={(arg) => {
           
            if (arg.view.type === 'dayGridMonth') {
              const ext: any = arg.event.extendedProps || {};
              const isDeadline = ext.type === 'deadline' && !ext.isExam;
              
              
              if (!isDeadline) {
                const el = arg.el;
                if (el) {
                  el.style.backgroundColor = '#ffffff';
                  el.style.color = '#111827';
                  el.style.border = 'none';
                 
                  const eventMain = el.querySelector('.fc-event-main');
                  if (eventMain) {
                    (eventMain as HTMLElement).style.color = '#111827';
                  }
                }
              }
            }
          }}
          height="auto"
          viewDidMount={(info) => {
            localStorage.setItem('calendar.initialView', info.view.type);
          }}
        />
      </div>

      {/* Calendar Event Modal */}
      <Modal
        title={editing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện'}
        open={modalOpen}
        onCancel={handleCloseEventModal}
        wrapClassName="calendar-event-modal"
        style={{ top: 20 }}
        footer={
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: editing?.seriesId ? 'space-between' : 'flex-end',
              alignItems: 'center',
            }}
          >
            {editing?.seriesId && (
              <Space size={8}>
                <span style={{ fontSize: 12 }}>Áp dụng cho:</span>
                <Radio.Group
                  size="small"
                  value={editingScope}
                  onChange={(e) => setEditingScope(e.target.value)}
                >
                  <Radio.Button value="single">Buổi này</Radio.Button>
                  <Radio.Button value="series">Cả chuỗi</Radio.Button>
                </Radio.Group>
              </Space>
            )}
            <Space>
              {editing && (
                <Button
                  danger
                  onClick={
                    editing.seriesId && editingScope === 'series'
                      ? onDeleteSeries
                      : onDelete
                  }
                >
                  {editing.seriesId && editingScope === 'series'
                    ? 'Xóa chuỗi'
                    : 'Xóa'}
                </Button>
              )}
              <Button onClick={handleCloseEventModal}>Hủy</Button>
              <Button
                type="primary"
                onClick={
                  editing?.seriesId && editingScope === 'series'
                    ? onSubmitSeries
                    : onSubmit
                }
              >
                {editing ? 'Lưu' : 'Tạo'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề" />
          </Form.Item>

          <Form.Item
            name="time"
            label="Thời gian"
            rules={[{ required: true, message: 'Chọn thời gian' }]}
          >
            <DatePicker.RangePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm"
              popupStyle={{ zIndex: 1051 }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={editing ? 24 : 8}>
              <Form.Item name="allDay" label="Cả ngày" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            {!editing && (
              <>
                <Col span={8}>
                  <Form.Item
                    name="repeatMode"
                    label="Lặp lại"
                    initialValue="none"
                  >
                    <Select
                      options={[
                        { value: 'none', label: 'Không lặp' },
                        { value: 'weekly', label: 'Hàng tuần (cùng thứ & giờ)' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.repeatMode !== curr.repeatMode}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('repeatMode') === 'weekly' && (
                        <Form.Item
                          name="repeatCount"
                          label="Số tuần lặp"
                          initialValue={4}
                          rules={[
                            {
                              type: 'number',
                              transform: (v) => (v == null ? undefined : Number(v)),
                              min: 1,
                              max: 52,
                              message: 'Nhập số tuần từ 1 đến 52',
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={1} max={52} style={{ width: '100%' }} />
                        </Form.Item>
                      )
                    }
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          <Form.Item name="color" label="Màu sắc" initialValue="#1a73e8">
            <ColorPicker
              presets={colorPresets}
              showText={false}
              format="hex"
              size="small"
              panelRender={(panel) => (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                    Màu cơ bản
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {colorPresets[0].colors.map((color) => {
                      const currentColor = form.getFieldValue('color') || '#1a73e8';
                      const isSelected = currentColor === color;
                      return (
                        <div
                          key={color}
                          onClick={() => form.setFieldValue('color', color)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: color,
                            cursor: 'pointer',
                            border: isSelected
                              ? '3px solid #1f3b5b'
                              : '2px solid #e5e7eb',
                            boxShadow: isSelected
                              ? '0 0 0 2px rgba(31,59,91,0.2)'
                              : 'none',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Ghi chú..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Deadline / Exam Modal */}
      <Modal
        title={
          deadlineIsExam
            ? `📝 ${editingDeadline?.title || 'Lịch thi'}`
            : `📅 ${editingDeadline?.title || 'Deadline'}`
        }
        open={deadlineModalOpen}
        onCancel={handleCloseDeadlineModal}
        footer={
          <Space>
            <Popconfirm
              title={deadlineIsExam ? 'Xóa lịch thi' : 'Xóa deadline'}
              description={
                deadlineIsExam
                  ? 'Bạn có chắc chắn muốn xóa lịch thi này?'
                  : 'Bạn có chắc chắn muốn xóa deadline này?'
              }
              onConfirm={onDeadlineDelete}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger>{deadlineIsExam ? 'Xóa lịch thi' : 'Xóa deadline'}</Button>
            </Popconfirm>

            <Button onClick={handleCloseDeadlineModal}>Hủy</Button>

            <Button
              type="primary"
              style={{
                backgroundColor:
                  editingDeadline?.status === 'completed' ? '#6b7280' : '#22c55e',
                borderColor:
                  editingDeadline?.status === 'completed' ? '#6b7280' : '#22c55e',
              }}
              onClick={onDeadlineToggleComplete}
            >
              {editingDeadline?.status === 'completed'
                ? '↩ Chưa hoàn thành'
                : '✓ Đã hoàn thành'}
            </Button>

            <Button type="primary" onClick={onDeadlineSubmit}>
              Lưu
            </Button>
          </Space>
        }
        width={650}
      >
        <Form layout="vertical" form={deadlineForm}>
          {deadlineIsExam && examCourses.length > 0 && (
            <Form.Item label="Môn học (lịch thi)">
              <Select
                showSearch
                placeholder="Chọn môn trong chương trình đào tạo"
                optionFilterProp="label"
                value={selectedExamCourse?.code}
                onChange={(code: string) => {
                  const c = examCourses.find((x) => x.code === code) || null;
                  setSelectedExamCourse(c);
                  if (c) {
                    const currentTitle = deadlineForm.getFieldValue('title');
                    const defaultTitle = `Thi ${c.name} (${c.code})`;
                    if (!currentTitle) {
                      deadlineForm.setFieldsValue({ title: defaultTitle });
                    }
                  }
                }}
                options={examCourses.map((c) => ({
                  value: c.code,
                  label: `${c.code} - ${c.name}`,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input placeholder={deadlineIsExam ? 'Ví dụ: Thi Lập trình Java (INT1234)' : 'Ví dụ: Bài tập chương 2'} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Ngày bắt đầu">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startTime" label="Giờ bắt đầu">
                <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="Ngày kết thúc"
                rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Giờ kết thúc">
                <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea
              rows={3}
              placeholder="Yêu cầu nộp bài, link tham khảo..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
