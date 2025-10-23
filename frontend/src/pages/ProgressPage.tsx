import { Card, Empty, Segmented, Select, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { progressDevSample } from '../data/progress-dev-sample';
import { progressDesignSample } from '../data/progress-design-sample';
import type { CourseResult, ProgressData, SemesterData, Specialization, SemesterKey } from '../types/progress';

// Types are imported from ../types/progress

// Convert numeric to letter grade per school rule
function gradeToLetter(grade?: number): string | undefined {
  if (grade === undefined) return undefined;
  if (grade >= 9) return 'A+';
  if (grade >= 8.5) return 'A';
  if (grade >= 8.0) return 'B+';
  if (grade >= 7.0) return 'B';
  if (grade >= 6.5) return 'C+';
  if (grade >= 5.5) return 'C';
  if (grade >= 5.0) return 'D+';
  if (grade >= 4.0) return 'D';
  return 'F';
}

const DEFAULT_SEMESTERS: { value: string; label: string }[] = Array.from({ length: 9 }, (_, i) => ({
  value: `HK${i + 1}`,
  label: `Học kỳ ${i + 1}`
}));

export default function ProgressPage() {
  const [specialization, setSpecialization] = useState<Specialization>('dev');
  const [semester, setSemester] = useState<SemesterKey | undefined>('HK1');

  // Placeholder: chờ dữ liệu thật từ bạn
  const data: ProgressData | undefined = specialization === 'design' ? progressDesignSample : progressDevSample;

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
          if (c.status === 'passed') earned += c.credit || 0;
        }
      }
    }
    return { total, earned };
  }, [data]);

  return (
    <div className="container">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={3} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
          Tiến trình học tập
        </Typography.Title>

        <Space wrap>
          <Segmented
            options={[{ value: 'dev', label: 'Phát triển ứng dụng ĐPT' }, { value: 'design', label: 'Thiết kế ĐPT' }]}
            value={specialization}
            onChange={(v) => setSpecialization(v as Specialization)}
          />image.png
          <Select
            style={{ minWidth: 220 }}
            placeholder="Chọn học kỳ (vd: 2023-2024-HK1)"
            options={semesters}
            value={semester}
            onChange={setSemester}
          />
        </Space>

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

        {!data ? (
          <Card>
            <Empty description={`Chưa có dữ liệu cho ${semesters.find(x=>x.value===semester)?.label ?? 'học kỳ'}. Gửi danh sách môn theo từng kỳ để hiển thị.`} />
          </Card>
        ) : (
          <div className="semester">
            <Space size={12} align="center" style={{ marginBottom: 8 }}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {semesters.find(x=>x.value===semester)?.label || selected?.semester}
              </Typography.Title>
              <Tag className="credit-total">Tổng {totalCredits} tín chỉ</Tag>
            </Space>
            <div className="course-grid">
              {(selected?.courses ?? []).map((c) => {
                const letter = gradeToLetter(c.grade);
                const muted = c.grade === undefined;
                const stripeClass = !letter ? '' :
                  letter.startsWith('A') ? ' grade-a' :
                  letter.startsWith('B') ? ' grade-b' :
                  letter.startsWith('C') ? ' grade-c' :
                  letter.startsWith('D') ? ' grade-d' : ' grade-f';
                return (
                  <Card key={c.code} className={`course-card${muted ? ' muted' : ''}${stripeClass}`}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Tag className="credit-pill">{c.credit} tín chỉ</Tag>
                      <Typography.Title className="course-title" level={5}>{c.name}</Typography.Title>
                      <Space size={8}>
                        <Tag>{c.code}</Tag>
                        {letter ? (
                          <Tag className={`grade-tag${stripeClass}`}>{letter}</Tag>
                        ) : (
                          <Tag>Chưa có điểm</Tag>
                        )}
                      </Space>
                    </Space>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Space>
    </div>
  );
}


