import { Card, Empty, Select, Space, Tag, Typography, Button, Modal, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { ExclamationCircleOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import type { ProgressData, SemesterData, Specialization, SemesterKey, CourseResult } from '../types/progress';
import { fourFrom10, letterFrom10 } from '../lib/grading';
import { getAuthUser } from '../services/auth';
import { fetchResults, fetchResultsMeta, saveSpecialization } from '../services/results';
import { fetchCurriculum } from '../services/curriculum';

// Types are imported from ../types/progress

// Use shared logic with ResultsPage
const gradeToLetter = letterFrom10;

const DEFAULT_SEMESTERS: { value: string; label: string }[] = Array.from({ length: 9 }, (_, i) => ({
  value: `HK${i + 1}`,
  label: `Học kỳ ${i + 1}`
}));

const CATEGORY_META = [
  { value: 'common', label: 'Bắt buộc chung', color: '#60a5fa' },
  { value: 'group-common', label: 'Bắt buộc chung nhóm ngành', color: '#38bdf8' },
  { value: 'foundation', label: 'Cơ sở ngành', color: '#ef4444' },
  { value: 'major', label: 'Bắt buộc ngành', color: '#f97316' },
  { value: 'specialization', label: 'Chuyên ngành', color: '#a855f7' },
  { value: 'professional', label: 'Giáo dục chuyên nghiệp', color: '#6366f1' },
  { value: 'internship', label: 'Thực tập', color: '#1d4ed8' },
  { value: 'thesis', label: 'Luận văn tốt nghiệp', color: '#16a34a' },
  { value: 'elective', label: 'Tự chọn', color: '#9ca3af' },
];

const DEFAULT_CATEGORY = { value: 'none', label: 'Chưa phân loại', color: '#e5e7eb' };

function inferCategoryFromCourse(course: CourseResult): string | undefined {
  const code = (course.code || '').toUpperCase();
  const name = (course.name || '').toLowerCase();

  // Thực tập / thực tập tốt nghiệp
  if (name.includes('thực tập')) return 'internship';

  // Đồ án / luận văn tốt nghiệp
  if (name.includes('đồ án tốt nghiệp') || name.includes('luận văn') || code.startsWith('CDT')) {
    return 'thesis';
  }

  // Bắt buộc chung: chính trị, GDQP, GDTC, tiếng Anh, kỹ năng mềm
  if (
    code.startsWith('BAS11') ||
    code.startsWith('SKD') ||
    name.includes('giáo dục') ||
    name.includes('kỹ năng') ||
    name.includes('mác') ||
    name.includes('lênin') ||
    name.includes('đảng cộng sản') ||
    name.includes('hồ chí minh') ||
    name.includes('tiếng anh')
  ) {
    return 'common';
  }

  // Cơ sở ngành: toán, xác suất, tin học cơ sở, CTDL, kiến trúc máy tính...
  if (
    code.startsWith('BAS12') ||
    code.startsWith('INT11') ||
    code.startsWith('INT13') ||
    name.includes('toán') ||
    name.includes('xác suất') ||
    name.includes('thống kê') ||
    name.includes('tin học cơ sở') ||
    name.includes('cấu trúc dữ liệu') ||
    name.includes('kiến trúc máy tính') ||
    name.includes('cơ sở dữ liệu')
  ) {
    return 'foundation';
  }

  // Cơ sở ngành thiên về nghệ thuật / tạo hình
  if (
    name.includes('cơ sở tạo hình') ||
    name.includes('nhập môn đa phương tiện') ||
    name.includes('kỹ thuật nhiếp ảnh') ||
    name.includes('mỹ thuật cơ bản') ||
    name.includes('thiết kế hình động 1')
  ) {
    return 'foundation';
  }

  // Bắt buộc ngành / chuyên ngành: xử lý ảnh/video/audio, web, game, di động, AR/VR, IoT, thị giác máy tính...
  if (
    name.includes('xử lý ảnh') ||
    name.includes('xử lý và truyền thông đa phương tiện') ||
    name.includes('dựng audio') ||
    name.includes('âm thanh') ||
    name.includes('lập trình web') ||
    name.includes('game') ||
    name.includes('đa phương tiện') ||
    name.includes('ứng dụng') ||
    name.includes('thực tại ảo') ||
    name.includes('iot') ||
    name.includes('thị giác máy tính') ||
    code.startsWith('MUL14') ||
    code.startsWith('ELE14') ||
    code.startsWith('INT14')
  ) {
    return 'major';
  }

  return undefined;
}

function getCourseCategoryMeta(course: CourseResult) {
  const value = course.category || inferCategoryFromCourse(course);
  if (!value) return DEFAULT_CATEGORY;
  return CATEGORY_META.find((c) => c.value === value) ?? DEFAULT_CATEGORY;
}

export default function ProgressPage() {
  const [specialization, setSpecialization] = useState<Specialization>(() => {
    try { const s = localStorage.getItem('specialization') as Specialization; if (s === 'dev' || s === 'design') return s; } catch {}
    return 'dev';
  });
  const [semester, setSemester] = useState<SemesterKey | undefined>(() => {
    try {
      const v = localStorage.getItem('currentStudySem') as SemesterKey | null;
      if (v && /^HK\d+$/i.test(v)) return v as SemesterKey;
    } catch {/* ignore */}
    return 'HK1';
  });
  const [currentStudySem, setCurrentStudySem] = useState<SemesterKey | undefined>(() => {
    try {
      const v = localStorage.getItem('currentStudySem') as SemesterKey | null;
      if (v && /^HK\d+$/i.test(v)) return v as SemesterKey;
    } catch {/* ignore */}
    return undefined;
  });
  const [showTrends, setShowTrends] = useState<boolean>(false);
  const [showSpecNote, setShowSpecNote] = useState<boolean>(false);

  const [base, setBase] = useState<ProgressData | undefined>(undefined);

  // Load curriculum by specialization
  useEffect(() => {
    try { localStorage.setItem('specialization', specialization); } catch {}
    fetchCurriculum(specialization).then(setBase).catch(() => setBase(undefined));
  }, [specialization]);

  // On mount, if user has saved specialization in DB, use it
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    fetchResultsMeta(u.id).then((meta) => {
      if (meta.specialization === 'dev' || meta.specialization === 'design') {
        setSpecialization(meta.specialization);
        try { localStorage.setItem('specialization', meta.specialization); } catch {}
      }
      if (meta.currentStudySem && /^HK\d+$/i.test(meta.currentStudySem)) {
        setCurrentStudySem(meta.currentStudySem as SemesterKey);
        setSemester(meta.currentStudySem as SemesterKey);
        try { localStorage.setItem('currentStudySem', meta.currentStudySem); } catch {}
      }
    }).catch(() => {});
  }, []);

  const [override, setOverride] = useState<Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> | undefined>(() => {
    try {
      const raw = localStorage.getItem('progress.override');
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as { data?: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> };
      return parsed?.data;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    fetchResults(u.id).then((serverData) => {
      setOverride(serverData);
      try { localStorage.setItem('progress.override', JSON.stringify({ data: serverData })); } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const reload = () => {
      const u = getAuthUser();
      if (u?.id) {
        fetchResults(u.id)
          .then((serverData) => {
            setOverride(serverData);
            try { localStorage.setItem('progress.override', JSON.stringify({ data: serverData })); } catch {}
          })
          .catch(() => {
            try {
              const raw = localStorage.getItem('progress.override');
              if (!raw) { setOverride(undefined); return; }
              const parsed = JSON.parse(raw) as { data?: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> };
              setOverride(parsed?.data);
            } catch {}
          });
      } else {
        try {
          const raw = localStorage.getItem('progress.override');
          if (!raw) { setOverride(undefined); return; }
          const parsed = JSON.parse(raw) as { data?: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> };
          setOverride(parsed?.data);
        } catch {}
      }
    };
    window.addEventListener('storage', reload);
    window.addEventListener('progress-override-changed', reload as any);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('progress-override-changed', reload as any);
    };
  }, []);

  // Merge tạm thời các điểm được đồng bộ từ trang Kết quả (override) vào base
  const data: ProgressData | undefined = useMemo(() => {
    if (!base) return undefined;
    if (!override) return base;
    const copy: ProgressData = JSON.parse(JSON.stringify(base));
    for (const sem of copy.semesters) {
      const overSem = override[sem.semester];
      if (!overSem) continue;
      for (const c of sem.courses) {
        const ov = overSem[c.code];
        if (!ov) continue;
        if (typeof ov.grade === 'number') c.grade = ov.grade;
        if (ov.status) c.status = ov.status;
        if (typeof ov.name === 'string') c.name = ov.name;
        if (typeof ov.credit === 'number') c.credit = ov.credit;
      }
    }
    return copy;
  }, [base, override]);

  const semesters: { value: string; label: string }[] = useMemo(() => {
    if (!data) return DEFAULT_SEMESTERS;
    return (data as ProgressData).semesters.map((s: SemesterData) => ({ value: s.semester, label: s.semester }));
  }, [data]);

  const selected: SemesterData | undefined = useMemo(() => {
    if (!data) return undefined;
    if (semester) return (data as ProgressData).semesters.find((s: SemesterData) => s.semester === semester);
    return (data as ProgressData).semesters[0];
  }, [data, semester]);

  const totalCredits = useMemo(() => {
    return (selected?.courses ?? []).reduce((sum, c) => sum + (c.countInCredits === false ? 0 : (c.credit || 0)), 0);
  }, [selected]);

  // Overall accumulated credits across the whole curriculum (exclude not-counted)
  const overallCreditStats = useMemo(() => {
    if (!data) return { total: 0, earned: 0 };
    let total = 0; let earned = 0;
    for (const sem of (data as ProgressData).semesters) {
      for (const c of sem.courses) {
        const countCredit = c.countInCredits !== false;
        if (countCredit) {
          total += c.credit || 0;
          if (c.status === 'passed' || (c.grade !== undefined && c.grade >= 4.0)) earned += c.credit || 0;
        }
      }
    }
    return { total, earned };
  }, [data]);

  // Per-semester GPA (thang 4) and earned credits
  const perSemesterStats = useMemo(() => {
    if (!data) return [] as { sem: SemesterKey; gpa4?: number; earned: number; failed: number }[];
    return (data as ProgressData).semesters.map((sem) => {
      let sumW = 0;
      let sumC = 0;
      let earned = 0;
      let failed = 0;
      for (const c of sem.courses) {
        const counts = c.countInGpa !== false;
        const countsCredit = c.countInCredits !== false;
        const credit = c.credit || 0;
        const isPassed = (c.status === 'passed') || (c.grade !== undefined && c.grade >= 4.0);
        const isFailed = (c.status === 'failed') || (c.grade !== undefined && c.grade < 4.0);
        if (countsCredit && isPassed) {
          earned += credit;
        }
        if (isFailed) failed += 1;
        if (counts && c.grade !== undefined) {
          const g4 = fourFrom10(c.grade);
          if (g4 !== undefined) {
            sumW += g4 * credit;
            sumC += credit;
          }
        }
      }
      return { sem: sem.semester, gpa4: sumC > 0 ? +(sumW / sumC).toFixed(2) : undefined, earned, failed };
    });
  }, [data]);

  // Stats for the currently selected semester only
  const currentSemStats = useMemo(() => {
    if (!selected) {
      return {
        gpa4: undefined as (number | undefined),
        earned: 0,
        total: 0,
        failedCourses: [] as { code: string; name: string; credit: number }[],
        dist: { 'A+': 0, A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 } as Record<string, number>,
      };
    }
    let sumW = 0; let sumC = 0; let earned = 0; let total = 0;
    const failedCourses: { code: string; name: string; credit: number }[] = [];
    const dist: Record<string, number> = { 'A+': 0, A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 };
    for (const c of selected.courses) {
      const credit = c.credit || 0;
      if (c.countInCredits !== false) total += credit;
      const isPassed = (c.status === 'passed') || (c.grade !== undefined && c.grade >= 4.0);
      const isFailed = (c.status === 'failed') || (c.grade !== undefined && c.grade < 4.0);
      if (c.countInCredits !== false && isPassed) earned += credit;
      if (isFailed) failedCourses.push({ code: c.code, name: c.name, credit });
      if (c.grade !== undefined) {
        const letter = gradeToLetter(c.grade);
        if (letter) dist[letter] = (dist[letter] || 0) + 1;
      }
      if (c.countInGpa !== false && c.grade !== undefined) {
        const g4 = fourFrom10(c.grade);
        if (g4 !== undefined) { sumW += g4 * credit; sumC += credit; }
      }
    }
    return { gpa4: sumC > 0 ? +(sumW / sumC).toFixed(2) : undefined, earned, total, failedCourses, dist };
  }, [selected]);

  // Grade distribution across all semesters
  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = { 'A+': 0, A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 };
    if (!data) return dist;
    for (const sem of (data as ProgressData).semesters) {
      for (const c of sem.courses) {
        if (c.grade === undefined) continue;
        const letter = gradeToLetter(c.grade);
        if (letter) dist[letter] = (dist[letter] || 0) + 1;
      }
    }
    return dist;
  }, [data]);

  // Group strengths/weaknesses by simple keyword buckets
  const groupStats = useMemo(() => {
    if (!data) return [] as { group: string; avg4?: number; credits: number }[];
    const groups: { group: string; keywords: string[] }[] = [
      { group: 'Lập trình', keywords: ['lập trình', 'program', 'java', 'c++', 'c#', 'node', 'web', 'react'] },
      { group: 'Toán', keywords: ['toán', 'math', 'xác suất', 'thống kê', 'đại số', 'giải tích'] },
      { group: 'Kỹ năng', keywords: ['kỹ năng', 'kĩ năng', 'thuyết trình', 'viết', 'văn bản', 'nhóm'] },
      { group: 'Mạng/Hệ thống', keywords: ['mạng', 'hệ điều hành', 'network', 'system'] },
      { group: 'Cơ sở', keywords: ['cơ sở', 'nhập môn', 'cơ sở dữ liệu', 'database'] },
    ];
    const lower = (s: string) => s.toLowerCase();
    const buckets = new Map<string, { sumW: number; sumC: number; credits: number }>();
    for (const g of groups) buckets.set(g.group, { sumW: 0, sumC: 0, credits: 0 });

    for (const sem of (data as ProgressData).semesters) {
      for (const c of sem.courses) {
        const name = lower(c.name);
        const credit = c.credit || 0;
        const g4 = c.grade !== undefined ? fourFrom10(c.grade) : undefined;
        for (const g of groups) {
          const hit = g.keywords.some((kw) => name.includes(kw));
          if (!hit) continue;
          const b = buckets.get(g.group)!;
          if (g4 !== undefined && c.countInGpa !== false) {
            b.sumW += g4 * credit; b.sumC += credit;
          }
          if (c.countInCredits !== false && (c.status === 'passed' || (c.grade !== undefined && c.grade >= 4.0))) {
            b.credits += credit;
          }
        }
      }
    }

    const out: { group: string; avg4?: number; credits: number }[] = [];
    for (const g of groups) {
      const b = buckets.get(g.group)!;
      out.push({ group: g.group, avg4: b.sumC > 0 ? +(b.sumW / b.sumC).toFixed(2) : undefined, credits: b.credits });
    }
    // Sort by avg desc, undefined last
    return out.sort((a, b) => (b.avg4 ?? -1) - (a.avg4 ?? -1));
  }, [data]);

  return (
    <div className="container">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
          Tiến trình học tập
        </Typography.Title>

        <Space wrap>
          <style>{`.spec-select .ant-select-selector { padding-left: 28px !important; }`}</style>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Select
              className="spec-select"
              style={{ minWidth: 220 }}
              placeholder="Chọn chuyên ngành"
              value={specialization}
              onChange={(v) => {
                setSpecialization(v as Specialization);
                try { localStorage.setItem('specialization', v as string); } catch {}
                const u = getAuthUser();
                if (u?.id) saveSpecialization(u.id, v as 'dev' | 'design').catch(() => {});
              }}
              options={[
                { value: 'dev', label: 'Phát triển ứng dụng ĐPT' },
                { value: 'design', label: 'Thiết kế ĐPT' },
              ]}
            />
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} onMouseDown={(e) => e.stopPropagation()}>
              <Tooltip title="Lưu ý: chọn chuyên ngành">
                <ExclamationCircleFilled style={{ color: 'var(--color-secondary)', fontSize: 18, cursor: 'pointer' }} onClick={() => setShowSpecNote(true)} />
              </Tooltip>
            </div>
          </div>
          <Select
            style={{ width: 120 }}
            placeholder="Chọn học kỳ"
            options={semesters}
            value={semester}
            onChange={setSemester}
          />
          <Select
            allowClear
            style={{ minWidth: 220 }}
            placeholder="Chọn kỳ học hiện tại"
            value={currentStudySem}
            onChange={(v) => {
              const val = v as SemesterKey | undefined;
              setCurrentStudySem(val);
              if (val) {
                setSemester(val);
              }
              try {
                if (val) {
                  localStorage.setItem('currentStudySem', val);
                } else {
                  localStorage.removeItem('currentStudySem');
                }
                window.dispatchEvent(new Event('current-study-sem-changed'));
              } catch {/* ignore */}

              // Lưu kỳ học hiện tại lên backend để chatbot và các phần khác dùng được
              const u = getAuthUser();
              if (u?.id) {
                // Gửi kỳ học hiện tại lên backend (không đụng tới dữ liệu điểm)
                fetch('/api/results', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: u.id, currentStudySem: val ?? null }),
                }).catch(() => {});
              }
            }}
            options={semesters.map((s) => ({ value: s.value as SemesterKey, label: `Kỳ học hiện tại: ${s.value}` }))}
          />
        </Space>

        <Modal
          title={<span style={{ color: 'var(--color-secondary)' }}>Lưu ý chọn chuyên ngành</span>}
          open={showSpecNote}
          onCancel={() => setShowSpecNote(false)}
          footer={null}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ExclamationCircleOutlined style={{ color: 'var(--color-secondary)', fontSize: 18, marginTop: 2 }} />
              <Typography.Text style={{ color: 'var(--color-secondary)' }}>
                Ngành Công nghệ Đa phương tiện học giống nhau từ kì 1 đến kì 4.
              </Typography.Text>
            </div>
            <Typography.Text style={{ color: 'var(--color-secondary)' }}>
              Bắt đầu từ kì 5 (tức là kì 1 năm 3) sẽ chọn chuyên ngành và học các môn theo chuyên ngành.
            </Typography.Text>
          </Space>
        </Modal>

        {data && (
          <Card>
            <div className="credit-progress">
              <div className="credit-progress-header">Số tín chỉ đã tích lũy/Tổng số tín chỉ toàn khóa</div>
              <div className="credit-bar">
                <div className="credit-bar-filled" style={{ width: `${Math.min(100, (overallCreditStats.earned / Math.max(1, overallCreditStats.total)) * 100)}%` }} />
                <div className="credit-marker" style={{ left: `${Math.min(100, (overallCreditStats.earned / Math.max(1, overallCreditStats.total)) * 100)}%` }}>
                  <div className="credit-bubble">{overallCreditStats.earned} tín</div>
                  <div className="credit-dot" />
                </div>
                <div className="credit-flag">{overallCreditStats.total} tín chỉ</div>
              </div>
            </div>
          </Card>
        )}

        {data && (
          <Modal
            title="Xu hướng & Thống kê"
            open={showTrends}
            onCancel={() => setShowTrends(false)}
            footer={null}
            width={900}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Ô 1: GPA kỳ hiện tại */}
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>GPA (thang 4) học kỳ</Typography.Text>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
                    {(data as ProgressData).semesters.map((s) => {
                      const isSel = s.semester === selected?.semester;
                      const val = isSel ? currentSemStats.gpa4 : undefined;
                      return (
                        <div key={`gpa-one-${s.semester}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <Typography.Text style={{ fontSize: 12, color: '#111827' }}>{val !== undefined ? val.toFixed(2) : '-'}</Typography.Text>
                          <div style={{
                            width: 18,
                            height: `${Math.max(2, Math.round(((val ?? 0) / 4) * 100))}px`,
                            background: 'var(--color-secondary)',
                            borderRadius: 4,
                            opacity: val === undefined ? 0.2 : 1,
                          }} />
                          <Typography.Text style={{ fontSize: 12, color: isSel ? '#111827' : '#9ca3af' }}>{s.semester}</Typography.Text>
                        </div>
                      );
                    })}
                  </div>
                </Space>
              </Card>

              {/* Ô 2: Môn trượt kỳ hiện tại */}
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>Môn trượt học kỳ</Typography.Text>
                  {currentSemStats.failedCourses.length === 0 ? (
                    <Typography.Text>Không có môn trượt</Typography.Text>
                  ) : (
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      {currentSemStats.failedCourses.map((fc) => (
                        <div key={fc.code} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center' }}>
                          <Tag>{fc.code}</Tag>
                          <Typography.Text ellipsis={{ tooltip: fc.name }}>{fc.name}</Typography.Text>
                          <Tag color="red">{fc.credit} tín</Tag>
                        </div>
                      ))}
                    </Space>
                  )}
                </Space>
              </Card>

              {/* Ô 3: Phân bố điểm chữ (gọn) */}
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>Phân bố điểm chữ (HK)</Typography.Text>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {['A+','A','B+','B','C+','C','D+','D','F'].map((k) => {
                      const count = (currentSemStats.dist as any)[k] || 0;
                      const max = Math.max(1, ...Object.values(currentSemStats.dist));
                      const pct = (count / max) * 100;
                      const color = k.startsWith('A') ? '#52c41a' : k.startsWith('B') ? '#389e0d' : k.startsWith('C') ? '#faad14' : k.startsWith('D') ? '#fa8c16' : '#ff4d4f';
                      return (
                        <div key={`row3-${k}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag style={{ margin: 0, borderRadius: 999, color: '#111827', background: '#fff', borderColor: '#e5e7eb' }}>{k}</Tag>
                          <div style={{ flex: 1, height: 8, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: count === 0 ? 0.25 : 1 }} />
                          </div>
                          <Tag style={{ margin: 0, borderRadius: 999, background: '#fff', borderColor: '#e5e7eb', color: '#4b5563' }}>{count}</Tag>
                        </div>
                      );
                    })}
                  </div>
                </Space>
              </Card>

              {/* Ô 4: Tín chỉ kỳ hiện tại */}
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>Tín chỉ học kỳ</Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6 }}>
                    <Typography.Text>- Đạt:</Typography.Text>
                    <Typography.Text strong style={{ color: '#b45309' }}>{currentSemStats.earned}</Typography.Text>
                    <Typography.Text>- Tổng:</Typography.Text>
                    <Typography.Text strong style={{ color: '#1f2937' }}>{currentSemStats.total}</Typography.Text>
                    <Typography.Text>- Còn lại:</Typography.Text>
                    <Typography.Text strong style={{ color: '#991b1b' }}>{Math.max(0, currentSemStats.total - currentSemStats.earned)}</Typography.Text>
                  </div>
                </Space>
              </Card>
            </div>
          </Modal>
        )}

        {!data ? (
          <Card>
            <Empty description={`Chưa có dữ liệu cho ${semesters.find(x=>x.value===semester)?.label ?? 'học kỳ'}. Gửi danh sách môn theo từng kỳ để hiển thị.`} />
          </Card>
        ) : (
          <div className="semester">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Space size={12} align="center">
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {semesters.find(x=>x.value===semester)?.label || selected?.semester}
                </Typography.Title>
                <Tag className="credit-total">Tổng {totalCredits} tín chỉ</Tag>
              </Space>
              <Button size="small" onClick={() => setShowTrends(true)}>Xu hướng & Thống kê</Button>
            </div>
            <div className="course-grid">
              {(selected?.courses ?? []).map((c) => {
                const letter = gradeToLetter(c.grade);
                const muted = c.grade === undefined;
                const gradeClass = !letter ? '' :
                  letter.startsWith('A') ? ' grade-a' :
                  letter.startsWith('B') ? ' grade-b' :
                  letter.startsWith('C') ? ' grade-c' :
                  letter.startsWith('D') ? ' grade-d' : ' grade-f';
                const catMeta = getCourseCategoryMeta(c);
                return (
                  <Card
                    key={c.code}
                    className={`course-card${muted ? ' muted' : ''}`}
                    style={{ borderLeftColor: catMeta.color }}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Tag className="credit-pill">{c.credit} tín chỉ</Tag>
                      <Typography.Title className="course-title" level={5}>{c.name}</Typography.Title>
                      <Space size={8}>
                        <Tag>{c.code}</Tag>
                        {letter ? (
                          <Tag className={`grade-tag${gradeClass}`}>{letter}</Tag>
                        ) : (
                          <Tag>Chưa có điểm</Tag>
                        )}
                      </Space>
                    </Space>
                  </Card>
                );
              })}
            </div>
            <div className="progress-legend-bar">
              <div className="admin-curriculum-legend">
                <div className="admin-curriculum-legend-item">
                  <span
                    className="admin-curriculum-legend-color"
                    style={{ background: DEFAULT_CATEGORY.color }}
                  />
                  <span>{DEFAULT_CATEGORY.label}</span>
                </div>
                {CATEGORY_META.map((opt) => (
                  <div key={opt.value} className="admin-curriculum-legend-item">
                    <span
                      className="admin-curriculum-legend-color"
                      style={{ background: opt.color }}
                    />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Space>
    </div>
  );
}


