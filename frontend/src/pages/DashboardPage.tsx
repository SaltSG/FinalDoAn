import { Card, Empty, Space, Tag, Typography, Button, Row, Col, Progress } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ProgressData } from '../types/progress';
import { fourFrom10 } from '../lib/grading';
import { getAuthUser } from '../services/auth';
import { fetchResults } from '../services/results';
import { fetchCurriculum } from '../services/curriculum';

type DashboardPageProps = {
  logoSrc?: string;
};

export default function DashboardPage({ logoSrc }: DashboardPageProps) {
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

  const deadlineSummary = useMemo(() => {
    try {
      const raw = localStorage.getItem('deadlines');
      if (!raw) return { total: 0, done: 0 };
      const arr = JSON.parse(raw) as { done?: boolean }[];
      const total = Array.isArray(arr) ? arr.length : 0;
      const done = Array.isArray(arr) ? arr.filter((d) => d && d.done).length : 0;
      return { total, done };
    } catch {
      return { total: 0, done: 0 };
    }
  }, []);

  // Mount animation for bars
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card
            style={{ marginBottom: 16 }}
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
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Nợ môn (tất cả các kỳ)</Typography.Title>
                <Tag color="red" style={{ borderRadius: 999, fontWeight: 600 }}>{failedCourses.length} môn</Tag>
              </div>
              {failedCourses.length === 0 ? (
                <Typography.Text>Không có nợ môn</Typography.Text>
              ) : (
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {failedCourses.map((fc) => (
                      <div key={`${fc.sem}-${fc.code}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 8, alignItems: 'center', transition: 'transform 240ms ease, opacity 240ms ease' }}>
                        <Tag>{fc.code}</Tag>
                        <Typography.Text ellipsis={{ tooltip: fc.name }}>{fc.name}</Typography.Text>
                        <Tag color="red">{fc.credit} tín</Tag>
                        <Tag color="blue">{fc.sem}</Tag>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Card>

            <Card>
              <Typography.Title level={5} style={{ marginTop: 0 }}>Deadline</Typography.Title>
              {deadlineSummary.total === 0 ? (
                <Typography.Text>Chưa có</Typography.Text>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'center' }}>
                  <Progress percent={Math.round((deadlineSummary.done / Math.max(1, deadlineSummary.total)) * 100)} status="active" strokeColor={{ from: '#34d399', to: '#16a34a' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <Typography.Text className="muted">Đã hoàn thành</Typography.Text>
                      <Typography.Title level={4} style={{ margin: 0 }}>{deadlineSummary.done}</Typography.Title>
                    </div>
                    <div>
                      <Typography.Text className="muted">Còn lại</Typography.Text>
                      <Typography.Title level={4} style={{ margin: 0 }}>{Math.max(0, deadlineSummary.total - deadlineSummary.done)}</Typography.Title>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Button size="small" href="#/deadline">Quản lý deadline</Button>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </main>
  );
}


