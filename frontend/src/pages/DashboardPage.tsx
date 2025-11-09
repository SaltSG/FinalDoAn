import { Card, Empty, Space, Tag, Typography, Button, Row, Col, Progress, Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProgressData } from '../types/progress';
import { fourFrom10 } from '../lib/grading';
import { getAuthUser } from '../services/auth';
import { fetchResults } from '../services/results';
import { fetchDeadlines as apiFetchDeadlines } from '../services/deadlines';
import { BellOutlined, RightOutlined } from '@ant-design/icons';
import { fetchCurriculum } from '../services/curriculum';

type DashboardPageProps = {
  logoSrc?: string;
};

export default function DashboardPage({ logoSrc }: DashboardPageProps) {
  const navigate = useNavigate();
  // Dữ liệu cơ sở: lấy từ curriculum theo chuyên ngành lưu gần nhất (mặc định 'dev')
  const [base, setBase] = useState<ProgressData | undefined>(undefined);
  useEffect(() => {
    let spec: 'dev' | 'design' = 'dev';
    try { const s = localStorage.getItem('specialization') as any; if (s === 'design' || s === 'dev') spec = s; } catch {}
    fetchCurriculum(spec).then(setBase).catch(() => setBase(undefined));
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

  const perSemesterStats = useMemo(() => {
    if (!data) return [] as { sem: string; gpa4?: number }[];
    return (data as ProgressData).semesters.map((sem) => {
      let sumW = 0; let sumC = 0;
      for (const c of sem.courses) {
        if (c.countInGpa === false) continue;
        if (c.grade === undefined) continue;
        const g4 = fourFrom10(c.grade);
        if (g4 === undefined) continue;
        sumW += g4 * (c.credit || 0);
        sumC += (c.credit || 0);
      }
      return { sem: sem.semester, gpa4: sumC > 0 ? +(sumW / sumC).toFixed(2) : undefined };
    });
  }, [data]);

  // GPA tích lũy hệ 4 theo từng học kỳ (tính đến học kỳ đó)
  const cumulativeGpa4 = useMemo(() => {
    const out: (number | undefined)[] = [];
    if (!data) return out;
    let sumW = 0; let sumC = 0;
    for (const sem of (data as ProgressData).semesters) {
      for (const c of sem.courses) {
        if (c.countInGpa === false) continue;
        if (c.grade === undefined) continue;
        // Theo quy tắc ở Results: GPA tích lũy chỉ tính các học phần ĐẠT (>= D ~ 4.0)
        if (c.grade < 4.0) continue;
        const g4 = fourFrom10(c.grade);
        if (g4 === undefined) continue;
        sumW += g4 * (c.credit || 0);
        sumC += (c.credit || 0);
      }
      out.push(sumC > 0 ? +(sumW / sumC).toFixed(2) : undefined);
    }
    return out;
  }, [data]);

  const overallCumGpa4 = useMemo(() => {
    return cumulativeGpa4.length ? cumulativeGpa4[cumulativeGpa4.length - 1] : undefined;
  }, [cumulativeGpa4]);

  const failedCourses = useMemo(() => {
    const out: { code: string; name: string; credit: number; sem: string }[] = [];
    if (!data) return out;
    for (const sem of (data as ProgressData).semesters) {
      for (const c of sem.courses) {
        const credit = c.credit || 0;
        const isFailed = (c.status === 'failed') || (c.grade !== undefined && c.grade < 4.0);
        if (isFailed) out.push({ code: c.code, name: c.name, credit, sem: sem.semester });
      }
    }
    return out;
  }, [data]);

  const [failedOpen, setFailedOpen] = useState(false);

  const [deadlineStats, setDeadlineStats] = useState<{ total: number; completed: number; ongoing: number } | undefined>(undefined);
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) { setDeadlineStats(undefined); return; }
    apiFetchDeadlines(u.id).then((items) => {
      const total = items.length;
      const completed = items.filter((d) => d.status === 'completed').length;
      const ongoing = items.filter((d) => d.status === 'ongoing').length;
      setDeadlineStats({ total, completed, ongoing });
    }).catch(() => setDeadlineStats(undefined));
  }, []);

  // Mount animation for bars
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Animated progress for Deadline circle (runs on mount/reload and when stats change)
  const [progressPercent, setProgressPercent] = useState<number>(0);
  useEffect(() => {
    const total = deadlineStats?.total || 0;
    const completed = deadlineStats?.completed || 0;
    const target = total > 0 ? Math.round((completed / Math.max(1, total)) * 100) : 0;
    let raf = 0;
    const duration = 1200; // ms
    const startValue = progressPercent;
    const delta = target - startValue;
    const startTs = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = () => {
      const t = Math.min(1, (performance.now() - startTs) / duration);
      const next = Math.round(startValue + delta * easeOut(t));
      setProgressPercent(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineStats?.total, deadlineStats?.completed]);

  return (
    <main className="container">
      <section className="hero">
        <div className="hero-brand">
          <div>
            <h2 className="brand">Tổng quan</h2>
          </div>
        </div>
      </section>

      {/* Bố cục 2 cột: trái (GPA lớn), phải (2 thẻ xếp dọc) */}
      <Row gutter={10}>
        <Col xs={24} lg={16}>
          <Card
            style={{ marginBottom: 10 }}
            title={<Typography.Text strong>GPA các học kỳ (thang 4)</Typography.Text>}
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Typography.Text style={{ fontSize: 12, color: '#6b7280' }}>Tổng GPA tích lũy:</Typography.Text>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg,#fde68a,#f59e0b)',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: 18,
                    boxShadow: '0 1px 0 rgba(0,0,0,0.06)'
                  }}
                >
                  {overallCumGpa4 !== undefined ? (overallCumGpa4 as number).toFixed(2) : '-'}
                </span>
              </div>
            }
          >
            {!data ? (
              <Empty description="Chưa có dữ liệu" />
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, perSemesterStats.length)}, 1fr)`, alignItems: 'end', gap: 16, minHeight: 240 }}>
                  {perSemesterStats.map((s) => (
                    <div key={`gpa-all-${s.sem}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Typography.Text style={{ fontSize: 12 }}>{s.gpa4 !== undefined ? s.gpa4.toFixed(2) : '-'}</Typography.Text>
                      <div style={{ width: 28, height: 180, background: '#eef2ff', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: '100%', height: `${mounted ? Math.max(6, Math.round(((s.gpa4 ?? 0) / 4) * 100)) : 0}%`, background: 'var(--color-secondary)', transition: 'height 600ms ease', opacity: s.gpa4 === undefined ? 0.2 : 1 }} />
                      </div>
                      <Typography.Text style={{ fontSize: 12, color: '#6b7280' }}>{s.sem}</Typography.Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Card bodyStyle={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>Nợ môn (tất cả các kỳ)</Typography.Title>
                <Tag className="failed-count" color="red">{failedCourses.length} môn</Tag>
              </div>
              {failedCourses.length === 0 ? (
                <Typography.Text>Không có nợ môn</Typography.Text>
              ) : (
                <div className="failed-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    {failedCourses.slice(0, 5).map((fc) => (
                      <div key={`${fc.sem}-${fc.code}`} className="failed-row">
                        <Tag className="failed-code">{fc.code}</Tag>
                        <Typography.Text className="failed-title" ellipsis={{ tooltip: fc.name }}>{fc.name}</Typography.Text>
                        <Tag className="failed-cred">{fc.credit} tín</Tag>
                        <Tag className="failed-sem">{fc.sem}</Tag>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Button type="link" className="link-arrow-button" onClick={() => setFailedOpen(true)}>
                  Xem chi tiết
                </Button>
              </div>
            </Card>

            <Modal
              open={failedOpen}
              onCancel={() => setFailedOpen(false)}
              footer={null}
              title={<Typography.Text strong>Nợ môn (tất cả các kỳ) — {failedCourses.length} môn</Typography.Text>}
              width={720}
            >
              {failedCourses.length === 0 ? (
                <Empty description="Không có nợ môn" />
              ) : (
                <div className="failed-list" style={{ maxHeight: 520, overflowY: 'auto' }}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    {failedCourses.map((fc) => (
                      <div key={`modal-${fc.sem}-${fc.code}`} className="failed-row">
                        <Tag className="failed-code">{fc.code}</Tag>
                        <Typography.Text className="failed-title" ellipsis={{ tooltip: fc.name }}>{fc.name}</Typography.Text>
                        <Tag className="failed-cred">{fc.credit} tín</Tag>
                        <Tag className="failed-sem">{fc.sem}</Tag>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Modal>

            <Card className="dash-deadline-card">
              <div className="dash-deadline-header">
                <div className="dash-deadline-icon"><BellOutlined /></div>
                <Typography.Title level={5} style={{ margin: 0 }}>Deadline</Typography.Title>
              </div>
              {!deadlineStats || deadlineStats.total === 0 ? (
                <Typography.Text>Chưa có</Typography.Text>
              ) : (
                <div className="dash-deadline-body">
                  <div className="deadline-progress-wrap">
                    <div className="progress-glow" />
                    <Progress
                      type="circle"
                      percent={progressPercent}
                      size={120}
                      strokeWidth={10}
                      strokeColor={{ '0%': '#34d399', '100%': '#16a34a' }}
                      trailColor="#e5e7eb"
                    />
                  </div>
                  <div className="deadline-kpis">
                    <div className={`kpi${(deadlineStats?.ongoing || 0) > 0 ? ' kpi-blink' : ''}`} onClick={() => navigate('/deadline?status=ongoing')} style={{ cursor: 'pointer' }}>
                      <div className="kpi-title">Đang diễn ra</div>
                      <div className="kpi-value pop">{deadlineStats.ongoing}</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi-title">Tỉ lệ hoàn thành</div>
                      <div className="kpi-value gradient">{Math.round((deadlineStats.completed / Math.max(1, deadlineStats.total)) * 100)}%</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="dash-deadline-footer">
                <Button type="link" className="link-arrow-button" onClick={() => navigate('/deadline')}>
                  Quản lý deadline <RightOutlined />
                </Button>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </main>
  );
}


