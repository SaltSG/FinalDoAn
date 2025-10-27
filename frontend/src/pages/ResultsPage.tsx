import { Button, Card, Descriptions, Input, InputNumber, Modal, Form, Select, Space, Tag, Typography, List, Avatar } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { progressDevSample } from '../data/progress-dev-sample';
import { fourFrom10, letterFrom10, letterTo10, letterTo4, rankFrom4, type Letter } from '../lib/grading';
import type { CourseResult, ProgressData, SemesterData } from '../types/progress';
import { DeleteOutlined, EditOutlined, PlusOutlined, AimOutlined } from '@ant-design/icons';

// giữ hàm cũ để tương thích, chuyển sang import từ lib nếu cần
const gradeToFour = fourFrom10;

const GRADE_OPTIONS = ['A+','A','B+','B','C+','C','D+','D','F'];

const gradeToLetter = letterFrom10;

type EditableCourse = CourseResult & {
  id: string;
  gradeLetter?: Letter;
  improveGradeLetter?: Letter;
  edit?: boolean;
};

type TargetKey = 'KHA' | 'GIOI' | 'XUATSAC';
const TARGETS: { value: TargetKey; label: string; threshold4: number }[] = [
  { value: 'KHA', label: 'Bằng khá', threshold4: 2.5 },
  { value: 'GIOI', label: 'Bằng giỏi', threshold4: 3.2 },
  { value: 'XUATSAC', label: 'Bằng xuất sắc', threshold4: 3.6 },
];

export default function ResultsPage() {
  const baseData: ProgressData = progressDevSample; // sau tích hợp API sẽ lấy theo user
  const [semesterKey, setSemesterKey] = useState<string>(baseData.semesters[0]?.semester || 'HK1');
  const [target, setTarget] = useState<TargetKey | undefined>(undefined);
  const [locked, setLocked] = useState<{ target: TargetKey; suggestions: string[]; items: { code: string; name: string; toLetter: Letter; credit: number }[] } | null>(null);

  const semesterList = baseData.semesters.map((s) => ({ value: s.semester, label: s.semester }));
  const initialCourses = useMemo<EditableCourse[]>(() => {
    const current = baseData.semesters.find((s) => s.semester === semesterKey) as SemesterData;
    return (current?.courses || []).map((c, idx) => ({ id: `${c.code}-${idx}`, ...c, gradeLetter: gradeToLetter(c.grade) as any, improve: 'none' as const }));
  }, [baseData, semesterKey]);

  const [courses, setCourses] = useState<EditableCourse[]>(initialCourses);
  const [semCourses, setSemCourses] = useState<Record<string, EditableCourse[]>>(() => {
    try {
      const saved = localStorage.getItem('results.semCourses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { [semesterKey]: initialCourses };
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm] = Form.useForm<{ name: string; credit: number }>();

  // helper màu tag theo letter
  const letterTagColor = (l: Letter) => {
    // Toàn bộ tag gợi ý dùng màu vàng để nhất quán theo yêu cầu
    return { color: 'gold', text: l };
  };

  // cập nhật khi đổi học kỳ
  const mapFromBase = (v: string) => {
    const current = baseData.semesters.find((s) => s.semester === v) as SemesterData;
    return (current?.courses || []).map((c, idx) => ({ id: `${c.code}-${idx}`, ...c, gradeLetter: gradeToLetter(c.grade) as any }));
  };

  const onChangeSemester = (v: string) => {
    // Lưu lại chỉnh sửa của học kỳ hiện tại
    setSemCourses((prev) => ({ ...prev, [semesterKey]: courses }));
    // Tải học kỳ mới từ bộ nhớ tạm hoặc dữ liệu gốc
    const existing = semCourses[v];
    setCourses(existing ?? mapFromBase(v));
    setSemesterKey(v);
  };

  // Tự động đồng bộ dữ liệu sang Tiến trình để test
  useEffect(() => {
    try {
      const payload: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> = {};
      const allSems = new Set<string>([...Object.keys(semCourses), ...baseData.semesters.map(s => s.semester)]);
      for (const semKey of allSems) {
        const list = semKey === semesterKey ? courses : (semCourses[semKey] ?? mapFromBase(semKey));
        if (!list) continue;
        for (const c of list) {
          if (!payload[semKey]) payload[semKey] = {};
          const bestLetter = (c as any).improveGradeLetter || (c as any).gradeLetter;
          let grade: number | undefined = (c as any).grade as number | undefined;
          if (grade === undefined && bestLetter) {
            grade = letterTo10[(bestLetter as Letter)] as number;
          }
          const status: 'passed' | 'failed' | 'in-progress' | undefined = grade === undefined ? undefined : (grade >= 4 ? 'passed' : 'failed');
          payload[semKey][(c as any).code] = { grade, status, name: (c as any).name, credit: (c as any).credit };
        }
      }
      localStorage.setItem('progress.override', JSON.stringify({ data: payload }));
    } catch {}
  }, [courses, semCourses, semesterKey]);

  const updateCourse = (id: string, patch: Partial<EditableCourse>) => {
    setCourses((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setSemCourses((map) => ({ ...map, [semesterKey]: next }));
      return next;
    });
  };

  const addCourse = (name: string, credit: number) => {
    setCourses((prev) => {
      const next = [ ...prev, { id: `new-${Date.now()}`, code: 'NEW', name, credit, gradeLetter: undefined } ];
      setSemCourses((map) => ({ ...map, [semesterKey]: next }));
      return next;
    });
  };

  const removeCourse = (id: string) => setCourses((prev) => {
    const next = prev.filter((c) => c.id !== id);
    setSemCourses((map) => ({ ...map, [semesterKey]: next }));
    return next;
  });

  // Persist local edits
  useEffect(() => {
    try { localStorage.setItem('results.semCourses', JSON.stringify(semCourses)); } catch {}
  }, [semCourses]);

  const semStats = useMemo(() => {
    const countable = courses.filter((c) => c.countInGpa !== false && (c.gradeLetter || (c as any).improveGradeLetter || (c as any).grade !== undefined));
    const sumCr = countable.reduce((s, c) => s + (c.credit || 0), 0);
    const sum10 = countable.reduce((s, c) => {
      const base10 = (c as any).grade as number | undefined;
      const main10FromLetter = c.gradeLetter ? letterTo10[(c.gradeLetter as Letter)] : undefined;
      const defaultFromBase = base10 !== undefined ? gradeToLetter(base10) : undefined;
      const useLetterOverride = c.gradeLetter !== undefined && base10 !== undefined && c.gradeLetter !== defaultFromBase;
      const main10 = base10 !== undefined && !useLetterOverride ? base10 : main10FromLetter;
      const gImp = (c as any).improveGradeLetter ? letterTo10[((c as any).improveGradeLetter as Letter)] : undefined;
      const best = Math.max(main10 ?? -1, gImp ?? -1);
      return s + (best > -1 ? best * (c.credit || 0) : 0);
    }, 0);
    const sum4 = countable.reduce((s, c) => {
      const base10 = (c as any).grade as number | undefined;
      const main4FromLetter = c.gradeLetter ? letterTo4[(c.gradeLetter as Letter)] : undefined;
      const defaultFromBase = base10 !== undefined ? gradeToLetter(base10) : undefined;
      const useLetterOverride = c.gradeLetter !== undefined && base10 !== undefined && c.gradeLetter !== defaultFromBase;
      const main4 = base10 !== undefined && !useLetterOverride ? (gradeToFour(base10) ?? 0) : (main4FromLetter ?? 0);
      const gImp = (c as any).improveGradeLetter ? letterTo4[((c as any).improveGradeLetter as Letter)] : undefined;
      const best = Math.max(main4 ?? -1, gImp ?? -1);
      return s + (best > -1 ? best * (c.credit || 0) : 0);
    }, 0);
    const g10 = sumCr > 0 ? +(sum10 / sumCr).toFixed(2) : 0;
    const g4hk = sumCr > 0 ? +(sum4 / sumCr).toFixed(2) : 0;
    const semEarned = courses.reduce((s, c) => {
      const credit = (c.credit || 0);
      if (c.countInCredits === false) return s;
      const gMain = c.gradeLetter ? letterTo10[(c.gradeLetter as Letter)] : undefined;
      const gImp = (c as any).improveGradeLetter ? letterTo10[((c as any).improveGradeLetter as Letter)] : undefined;
      const best = Math.max(gMain ?? -1, gImp ?? -1);
      return s + (best >= 4 ? credit : 0);
    }, 0);

    // cumulative (dùng baseData + override của học kỳ đang chọn)
    let totalCr = 0; let earnedCr = 0; let cumCrForGpa = 0; let cumSum10 = 0; let cumSum4 = 0;
    for (const sem of baseData.semesters) {
      const list: (CourseResult | EditableCourse)[] =
        sem.semester === semesterKey
          ? courses
          : ((semCourses[sem.semester] as (EditableCourse[] | undefined)) ?? mapFromBase(sem.semester));
      for (const c of list) {
        const countCredit = (c as any).countInCredits !== false;
        const countGpa = (c as any).countInGpa !== false;
        const credit = (c as any).credit || 0;

        // Tính điểm tốt nhất theo thang 10 và thang 4 (ưu tiên điểm cải thiện)
        let best10: number | undefined;
        let best4: number = 0;
        const hasLetters = (c as any).gradeLetter !== undefined || (c as any).improveGradeLetter !== undefined;
        if (hasLetters) {
          const _c = c as any as EditableCourse & { improveGradeLetter?: Letter };
          const gMain10 = _c.gradeLetter ? letterTo10[_c.gradeLetter] : undefined;
          const gImp10 = _c.improveGradeLetter ? letterTo10[_c.improveGradeLetter] : undefined;
          best10 = (gMain10 === undefined && gImp10 === undefined) ? undefined : Math.max(gMain10 ?? -1, gImp10 ?? -1);
          const gMain4 = _c.gradeLetter ? letterTo4[_c.gradeLetter] : -1;
          const gImp4 = _c.improveGradeLetter ? letterTo4[_c.improveGradeLetter] : -1;
          best4 = Math.max(gMain4, gImp4, 0);
        } else {
          const g10raw = (c as CourseResult).grade;
          best10 = g10raw;
          best4 = g10raw !== undefined ? (gradeToFour(g10raw) ?? 0) : 0;
        }

        if (countCredit) {
          totalCr += credit;
          if ((best10 ?? 0) >= 4) earnedCr += credit;
        }

        // GPA tích lũy: chỉ tính các học phần ĐẠT (>= D) theo yêu cầu "tổng số tín chỉ tích lũy"
        if (countGpa && best10 !== undefined && best10 >= 4) {
          cumCrForGpa += credit;
          cumSum10 += (best10 as number) * credit;
          cumSum4 += best4 * credit;
        }
      }
    }
    const cum10 = cumCrForGpa > 0 ? +(cumSum10 / cumCrForGpa).toFixed(2) : 0;
    const cum4 = cumCrForGpa > 0 ? +(cumSum4 / cumCrForGpa).toFixed(2) : 0;
    return { g10, g4hk, semEarned, cum10, cum4, totalCr, earnedCr, cumCrForGpa, cumSum4 };
  }, [courses, baseData, semesterKey, semCourses]);

  const goalSuggestions = useMemo(() => {
    if (!target) return { need: 0, suggestions: [] as string[], items: [] as { code: string; name: string; toLetter: Letter; credit: number }[], reached: false };
    const threshold = TARGETS.find((t) => t.value === target)!.threshold4;
    const current = semStats.cum4;
    if (current >= threshold) return { need: 0, suggestions: ["Bạn đã đạt mục tiêu 🎉"], items: [], reached: true };

    // Khoảng thiếu để đạt mục tiêu, tính theo tổng hiện tại
    let denom = semStats.cumCrForGpa || 0; // tổng tín chỉ đang được tính GPA
    let sum4 = semStats.cumSum4 || 0;      // tổng (điểm hệ 4 × tín chỉ) hiện tại
    let gap = threshold * denom - sum4;    // cần bù thêm (điểm*tc) để đạt threshold trên mẫu hiện tại

    const semNumOf = (hk: string) => {
      const m = hk.match(/HK(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    };
    const currentNum = semNumOf(semesterKey);

    const rung4: { val: number; letter: Letter }[] = [
      { val: 2.0, letter: 'C' },
      { val: 2.5, letter: 'C+' },
      { val: 3.0, letter: 'B' },
      { val: 3.5, letter: 'B+' },
      { val: 3.7, letter: 'A' },
      { val: 4.0, letter: 'A+' },
    ];

    type State = {
      code: string;
      name: string;
      credit: number;
      base4: number;
      counted: boolean;
      level: number;
      suggested?: number;
      isLow: boolean;
    };
    const states: State[] = [];

    for (const sem of baseData.semesters) {
      const semNum = semNumOf(sem.semester);
      if (semNum > currentNum) continue;
      const list: (CourseResult | EditableCourse)[] =
        sem.semester === semesterKey
          ? courses
          : ((semCourses[sem.semester] as (EditableCourse[] | undefined)) ?? mapFromBase(sem.semester));
      const isCurrentSem = semNum === currentNum;

      for (const c of list) {
        const countGpa = (c as any).countInGpa !== false;
        if (!countGpa) continue;
        const credit = (c as any).credit || 0;
        const hasLetters = (c as any).gradeLetter !== undefined || (c as any).improveGradeLetter !== undefined;
        const hasRaw = (c as CourseResult).grade !== undefined;
        if (!isCurrentSem && !(hasLetters || hasRaw)) continue;

        let best4 = 0;
        let best10: number | undefined = undefined;
        if (hasLetters) {
          const _c = c as any as EditableCourse & { improveGradeLetter?: Letter };
          const gMain4 = _c.gradeLetter ? letterTo4[_c.gradeLetter] : -1;
          const gImp4 = _c.improveGradeLetter ? letterTo4[_c.improveGradeLetter] : -1;
          best4 = Math.max(gMain4, gImp4, 0);
          const gMain10 = _c.gradeLetter ? letterTo10[_c.gradeLetter] : -1;
          const gImp10 = _c.improveGradeLetter ? letterTo10[_c.improveGradeLetter] : -1;
          best10 = Math.max(gMain10, gImp10);
        } else {
          const g10raw = (c as CourseResult).grade;
          best10 = g10raw;
          best4 = g10raw !== undefined ? (gradeToFour(g10raw) ?? 0) : 0;
        }
        const counted = (best10 ?? 0) >= 4;

        states.push({
          code: (c as any).code,
          name: (c as any).name,
          credit,
          base4: best4,
          counted,
          level: best4,
          suggested: undefined,
          isLow: best4 <= 2.5,
        });
      }
    }

    if (states.length === 0) {
      return { need: +gap.toFixed(2), suggestions: [], items: [], reached: false };
    }

    const nextStep = (s: State): { nextVal: number; letter: Letter; dSum: number; dDen: number } | null => {
      const cand = rung4.find((r) => r.val > s.level) || null;
      if (!cand) return null;
      const dVal = cand.val - s.level;
      const dSum = dVal * s.credit;
      const dDen = s.counted ? 0 : s.credit;
      return { nextVal: cand.val, letter: cand.letter, dSum, dDen };
    };

    const chosen: Record<string, Letter> = {};
    const bias = (s: State) => (s.isLow ? 0.0001 : 0);

    let safety = 0;
    while (gap > 1e-6 && safety < 1000) {
      safety++;
      let bestIdx = -1;
      let bestScore = -Infinity;
      let bestStep: { nextVal: number; letter: Letter; dSum: number; dDen: number } | null = null;

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const step = nextStep(s);
        if (!step) continue;
        const score = (step.dSum - threshold * step.dDen) + bias(s);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
          bestStep = step;
        }
      }

      if (bestIdx === -1 || !bestStep) break;

      const s = states[bestIdx];
      s.level = bestStep.nextVal;
      s.suggested = bestStep.nextVal;
      if (!s.counted && bestStep.dDen > 0) s.counted = true;

      denom += bestStep.dDen;
      sum4 += bestStep.dSum;
      gap = threshold * denom - sum4;

      chosen[s.code] = rung4.find((r) => r.val === s.suggested)!.letter;
    }

    const items = states
      .filter((s) => s.suggested !== undefined && s.suggested! > s.base4)
      .sort((a, b) => (a.base4 - b.base4) || (b.credit - a.credit))
      .map((s) => ({ code: s.code, name: s.name, toLetter: rung4.find((r) => r.val === s.suggested)!.letter, credit: s.credit }));

    const suggestions = items.map((p) => `Cải thiện ${p.code} – ${p.name} lên ${p.toLetter}`);
    return { need: +Math.max(0, gap).toFixed(2), suggestions, items, reached: items.length === 0 };
  }, [target, semStats, baseData, courses, semCourses, semesterKey]);

  // Khóa gợi ý ngay khi chọn mục tiêu; không tự đổi khi bạn chỉnh điểm
  useEffect(() => {
    if (target) {
      setLocked({ target, suggestions: goalSuggestions.suggestions, items: goalSuggestions.items });
    } else {
      setLocked(null);
    }
  }, [target]);

  return (
    <div className="container">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
          Kết quả học tập
        </Typography.Title>

        <div className="results-top" style={{ display: 'flex', gap: 8 }}>
          <Select options={semesterList} value={semesterKey} onChange={onChangeSemester} style={{ minWidth: 220 }} />
                <Select
            allowClear
            placeholder={
              <span><AimOutlined style={{ color: '#b91c1c', marginRight: 6 }} />Đặt mục tiêu</span>
            }
            value={target as any}
            onChange={(v) => setTarget(v as TargetKey)}
            options={TARGETS.map((t) => ({
              value: t.value,
              label: (
                <span>
                  <AimOutlined style={{ color: '#b91c1c', marginRight: 6 }} />{t.label}
                </span>
              ),
            }))}
            optionLabelProp="label"
            style={{ minWidth: 200, borderColor: '#b91c1c' }}
          />
        </div>

        {target && (
          <Card size="small">
            {(locked?.target === target ? { ...goalSuggestions, suggestions: locked.suggestions, items: locked.items } : goalSuggestions).reached ? (
              <Typography.Text strong style={{ color: '#16a34a' }}>Bạn đã đạt mục tiêu 🎉</Typography.Text>
            ) : (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>
                  Gợi ý cải thiện để đạt mục tiêu:
                </Typography.Text>
                <div className="suggest-rows">
                  {(locked?.target === target ? locked.items : goalSuggestions.items).map((it) => {
                    const tag = letterTagColor(it.toLetter);
                    return (
                      <div key={it.code + it.toLetter} className="suggest-row">
                        <Typography.Text className="suggest-code" strong>{it.code}</Typography.Text>
                        <Tag className="suggest-tag" style={{ marginInline: 0 }}>{it.credit} tín</Tag>
                        <Typography.Text className="suggest-name">{it.name}</Typography.Text>
                        <Tag color={tag.color} className="suggest-tag" style={{ marginInline: 0 }}>Lên {tag.text}</Tag>
                      </div>
                    );
                  })}
                </div>
              </Space>
            )}
          </Card>
        )}

        <Card>
          <Space direction="vertical" size={0} style={{ width: '100%' }} className="results-list">
            {courses.map((c) => (
              <div key={c.id} className="result-row">
                <div className="col-cred"><Tag>{c.credit} tín chỉ</Tag></div>
                {c.edit ? (
                  <>
                    <Input value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} />
                    <InputNumber min={1} max={10} value={c.credit} onChange={(v) => updateCourse(c.id, { credit: Number(v) })} />
                  </>
                ) : (
                  <Typography.Text strong className="col-name">{c.name}</Typography.Text>
                )}
                <Select
                  placeholder="Chọn điểm"
                  value={c.gradeLetter ?? ('NA' as any)}
                  onChange={(v) => updateCourse(c.id, { gradeLetter: (v === 'NA' ? undefined : (v as Letter)) })}
                  options={[{ value: 'NA', label: 'Chưa có điểm' }, ...GRADE_OPTIONS.map((g) => ({ value: g, label: g }))]}
                  className="col-grade"
                />
                <Select
                  placeholder="Điểm cải thiện"
                  value={c.improveGradeLetter ?? ('IMPROVE' as any)}
                  onChange={(v) => updateCourse(c.id, { improveGradeLetter: (v === 'IMPROVE' ? undefined : (v as Letter)) })}
                  options={[{ value: 'IMPROVE', label: 'Điểm cải thiện' }, ...GRADE_OPTIONS.map((g) => ({ value: g, label: g }))]}
                  className="col-improve"
                />
                <div className="col-actions">
                  <Space>
                    <Button size="small" icon={<EditOutlined />} aria-label="Chỉnh sửa" onClick={() => updateCourse(c.id, { edit: !c.edit })} />
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label="Xóa" onClick={() => removeCourse(c.id)} />
                  </Space>
                </div>
              </div>
            ))}
            <Button icon={<PlusOutlined />} onClick={() => setIsAddOpen(true)}>Thêm môn học</Button>
          </Space>
        </Card>

        {/* Hàng 3 phần: Học kỳ | Tích lũy | Xếp hạng */}
        <div className="results-stats-row">
          <div className="stat-list">
            <div className="stat-item">
              <span className="stat-label">- Điểm trung bình học kỳ hệ 4:</span>
              <span className="stat-value orange">{semStats.g4hk}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">- Điểm trung bình học kỳ hệ 10:</span>
              <span className="stat-value orange">{semStats.g10}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">- Số tín chỉ đạt học kỳ:</span>
              <span className="stat-value orange">{semStats.semEarned}</span>
            </div>
          </div>
          <div className="stat-list">
            <div className="stat-item">
              <span className="stat-label">- Điểm trung bình tích lũy hệ 4:</span>
              <span className="stat-value orange">{semStats.cum4}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">- Điểm trung bình tích lũy hệ 10:</span>
              <span className="stat-value orange">{semStats.cum10}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">- Số tín chỉ tích lũy:</span>
              <span className="stat-value orange">{semStats.earnedCr}</span>
            </div>
          </div>
          <div className="rank-item">
            <span className="stat-label">- Phân loại điểm trung bình HK:</span>
            <span className="stat-value purple">{rankFrom4(semStats.cum4)}</span>
          </div>
        </div>

        <Modal
          title="Thêm môn học"
          open={isAddOpen}
          onCancel={() => { setIsAddOpen(false); addForm.resetFields(); }}
          onOk={async () => {
            try {
              const values = await addForm.validateFields();
              addCourse(values.name, values.credit);
              setIsAddOpen(false);
              addForm.resetFields();
            } catch { /* ignore */ }
          }}
          okText="Lưu"
          cancelText="Hủy"
        >
          <Form form={addForm} layout="vertical">
            <Form.Item label="Tên môn học" name="name" rules={[{ required: true, message: 'Nhập tên môn học' }]}>
              <Input placeholder="Ví dụ: Toán cao cấp 1" />
            </Form.Item>
            <Form.Item label="Số tín chỉ" name="credit" rules={[{ required: true, message: 'Nhập số tín chỉ' }]}>
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}


