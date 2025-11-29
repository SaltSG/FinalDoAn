import { Button, Card, Descriptions, Input, InputNumber, Modal, Form, Select, Space, Tag, Typography, List, Avatar, Popconfirm } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { fourFrom10, letterFrom10, letterTo10, letterTo4, rankFrom4, type Letter } from '../lib/grading';
import { getAuthUser } from '../services/auth';
import { saveResults, fetchResults } from '../services/results';
import { fetchResultsMeta } from '../services/results';
import { fetchCurriculum, addCourseToCurriculum, updateCourseInCurriculum, deleteCourseInCurriculum } from '../services/curriculum';
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
  const [specialization, setSpecialization] = useState<'dev' | 'design'>(() => {
    try {
      const s = localStorage.getItem('specialization') as any;
      return (s === 'design' || s === 'dev') ? s : 'dev';
    } catch {
      return 'dev';
    }
  });
  const [baseData, setBaseData] = useState<ProgressData | undefined>(undefined);
  const [semesterKey, setSemesterKey] = useState<string>('HK1');
  const [target, setTarget] = useState<TargetKey | undefined>(() => {
    try {
      const v = localStorage.getItem('targetGoal') as TargetKey | null;
      if (v === 'KHA' || v === 'GIOI' || v === 'XUATSAC') return v;
    } catch {/* ignore */}
    return undefined;
  });
  const [currentStudySem, setCurrentStudySem] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('currentStudySem') || undefined;
    } catch {
      return undefined;
    }
  });

  const semesterList = (baseData?.semesters ?? []).map((s) => ({ value: s.semester, label: s.semester }));
  const initialCourses = useMemo<EditableCourse[]>(() => {
    const current = (baseData?.semesters || []).find((s) => s.semester === semesterKey) as SemesterData;
    return (current?.courses || []).map((c, idx) => ({ id: `${c.code}-${idx}`, ...c, gradeLetter: gradeToLetter(c.grade) as any, improve: 'none' as const }));
  }, [baseData, semesterKey]);

  const [semCourses, setSemCourses] = useState<Record<string, EditableCourse[]>>(() => {
    try {
      const saved = localStorage.getItem('results.semCourses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [courses, setCourses] = useState<EditableCourse[]>(() => {
    try {
      const saved = localStorage.getItem('results.semCourses');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, EditableCourse[]>;
        if (parsed && parsed[semesterKey]) return parsed[semesterKey];
      }
    } catch {}
    return [];
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm] = Form.useForm<{ name: string; credit: number }>();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm] = Form.useForm<{ name: string; credit: number }>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // helper màu tag theo letter
  const letterTagColor = (l: Letter) => {
    // Toàn bộ tag gợi ý dùng màu vàng để nhất quán theo yêu cầu
    return { color: 'gold', text: l };
  };

  // cập nhật khi đổi học kỳ
  const mapFromBase = (v: string) => {
    const current = (baseData?.semesters || []).find((s) => s.semester === v) as SemesterData;
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

  // Tải chương trình đào tạo từ DB theo chuyên ngành
  useEffect(() => {
    try { localStorage.setItem('specialization', specialization); } catch {}
    fetchCurriculum(specialization).then((data) => {
      setBaseData(data);
      const first = data.semesters[0]?.semester;
      if (first) setSemesterKey(first);
      // luôn đồng bộ toàn bộ học kỳ từ curriculum (không dùng dữ liệu mẫu/đã lưu cũ)
      const mapped: Record<string, EditableCourse[]> = {};
      for (const sem of data.semesters) {
        mapped[sem.semester] = sem.courses.map((c, idx) => ({ id: `${c.code}-${idx}`, ...c })) as any;
      }
      setSemCourses(mapped);
      try { localStorage.setItem('results.semCourses', JSON.stringify(mapped)); } catch {}
      setCourses(mapped[first] || []);
    }).catch(() => {
      // leave empty if fail
    });
  }, [specialization]);

  // Đồng bộ chuyên ngành từ server (nếu có) nhưng không hiển thị dropdown
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) return;
    fetchResultsMeta(u.id).then((m) => {
      if (m.specialization === 'dev' || m.specialization === 'design') {
        setSpecialization(m.specialization);
        try { localStorage.setItem('specialization', m.specialization); } catch {}
      }
    }).catch(() => {});
  }, []);

  // Tải override từ server khi có user đăng nhập và hydrate vào semCourses + courses + localStorage
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id || !baseData) return;
    fetchResults(u.id).then((serverData) => {
      try {
        const next: Record<string, EditableCourse[]> = { ...semCourses };
        const semKeys = new Set<string>([
          ...Object.keys(serverData || {}),
          ...(baseData?.semesters || []).map((s) => s.semester),
        ]);
        for (const hk of semKeys) {
          const baseList = next[hk] ?? mapFromBase(hk);
          const over = (serverData as any)?.[hk];
          if (!over) { next[hk] = baseList; continue; }
          const mapped = baseList.map((c) => {
            const ov = over[(c as any).code];
            if (!ov) return c;
            const g = typeof ov.grade === 'number' ? ov.grade : undefined;
            const gradeLetter = g !== undefined ? (gradeToLetter(g) as any) : (c as any).gradeLetter;
            // Luôn lấy name/credit từ curriculum để đảm bảo đồng bộ DB
            const credit = (c as any).credit;
            const name = (c as any).name;
            return { ...c, gradeLetter, credit, name } as EditableCourse;
          });
          next[hk] = mapped;
        }
        setSemCourses(next);
        // Nếu đang ở học kỳ hiện tại, cập nhật courses
        setCourses(next[semesterKey] ?? mapFromBase(semesterKey));
        localStorage.setItem('results.semCourses', JSON.stringify(next));
        // Ghi đồng bộ override theo format Progress/Dashboard đang dùng
        const payload: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> = serverData || {};
        localStorage.setItem('progress.override', JSON.stringify({ data: payload }));
        try { window.dispatchEvent(new Event('progress-override-changed')); } catch {}
      } catch {}
    }).catch(() => {}).finally(() => { setHydrated(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseData]);

  // Tự động đồng bộ dữ liệu sang Tiến trình để test
  useEffect(() => {
    if (!hydrated || !baseData) return;
    try {
      const payload: Record<string, Record<string, { grade?: number; status?: 'passed' | 'failed' | 'in-progress'; name?: string; credit?: number }>> = {};
      const allSems = new Set<string>([...Object.keys(semCourses), ...(baseData?.semesters || []).map(s => s.semester)]);
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
          // Chỉ lưu grade/status vào override; name/credit lấy từ curriculum DB
          payload[semKey][(c as any).code] = { grade, status } as any;
        }
      }
      const dataObj = { data: payload };
      localStorage.setItem('progress.override', JSON.stringify(dataObj));
      // Broadcast to other pages within the app
      try { window.dispatchEvent(new Event('progress-override-changed')); } catch {}
      // Persist to server if logged in
      const u = getAuthUser();
      if (u?.id) {
        saveResults(u.id, payload).catch(() => {/* ignore network errors for now */});
      }
    } catch {}
  }, [courses, semCourses, semesterKey, hydrated, baseData]);

  // Hydration: nếu đã đăng nhập, đợi tải override từ server xong mới bật auto-save
  useEffect(() => {
    const u = getAuthUser();
    if (!u?.id) { setHydrated(true); return; }
    // Nếu đã đăng nhập, việc setHydrated(true) được thực hiện trong fetchResults effect sau khi áp dụng dữ liệu
  }, []);

  const updateCourse = (id: string, patch: Partial<EditableCourse>) => {
    setCourses((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setSemCourses((map) => ({ ...map, [semesterKey]: next }));
      return next;
    });
  };

  const addCourse = (name: string, credit: number) => {
    const code = `CUST-${Date.now()}`;
    setCourses((prev) => {
      const next = [ ...prev, { id: `new-${Date.now()}`, code, name, credit, gradeLetter: undefined } ];
      setSemCourses((map) => ({ ...map, [semesterKey]: next }));
      return next;
    });
    // Persist to curriculum DB as well
    addCourseToCurriculum(specialization, semesterKey, { code, name, credit }).catch(() => {/* ignore for now */});
  };

  const removeCourse = (id: string) => setCourses((prev) => {
    const target = prev.find((c) => c.id === id);
    const next = prev.filter((c) => c.id !== id);
    setSemCourses((map) => ({ ...map, [semesterKey]: next }));
    // Persist deletion to curriculum DB if course has a code
    if (target?.code) {
      deleteCourseInCurriculum(specialization, target.code).catch(() => {/* ignore for now */});
    }
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
    const baseSemesters = baseData?.semesters ?? [];
    for (const sem of baseSemesters) {
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
    if (!target || !baseData) {
      return {
        need: 0,
        suggestions: [] as string[],
        items: [] as { sem?: string; code: string; name: string; toLetter: Letter; credit: number }[],
        reached: false,
      };
    }

    const threshold = TARGETS.find((t) => t.value === target)!.threshold4;

    // GỢI Ý CHO TẤT CẢ CÁC HỌC KỲ CÙNG LÚC (GLOBAL GREEDY)
    // - Tính GPA tích lũy toàn khóa.
    // - Chọn một số môn ở nhiều kỳ sao cho nâng chúng lên sẽ giúp đạt mục tiêu.

    type Cand = { sem: string; code: string; name: string; credit: number; current4: number };

    let sumCr = 0;
    let sum4 = 0;
    const cands: Cand[] = [];

    const semIndex = (hk: string) => {
      const m = hk.match(/HK(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    };

    const limitIndex = currentStudySem ? semIndex(currentStudySem) : Infinity;
    const allSemKeys = baseData.semesters
      .map((s) => s.semester)
      .filter((hk) => semIndex(hk) <= limitIndex);

    for (const hk of allSemKeys) {
      const list: (CourseResult | EditableCourse)[] =
        hk === semesterKey ? courses : (semCourses[hk] ?? mapFromBase(hk));
      if (!list || !list.length) continue;

      const hasAnyGraded = list.some((c) => {
        const baseGrade = (c as CourseResult).grade;
        const hasLetters =
          (c as any).gradeLetter !== undefined ||
          (c as any).improveGradeLetter !== undefined;
        return baseGrade !== undefined || hasLetters;
      });
      if (!hasAnyGraded) continue;

      for (const c of list) {
        if ((c as any).countInGpa === false) continue;
        const credit = (c as any).credit || 0;
        if (!credit) continue;

        let best4: number | undefined;
        const hasLetters =
          (c as any).gradeLetter !== undefined ||
          (c as any).improveGradeLetter !== undefined;
        if (hasLetters) {
          const _c = c as any as EditableCourse & { improveGradeLetter?: Letter };
          const gMain4 = _c.gradeLetter ? letterTo4[_c.gradeLetter] : -1;
          const gImp4 = _c.improveGradeLetter ? letterTo4[_c.improveGradeLetter] : -1;
          const v = Math.max(gMain4, gImp4);
          best4 = v >= 0 ? v : undefined;
        } else if ((c as CourseResult).grade !== undefined) {
          best4 = gradeToFour((c as CourseResult).grade!) ?? undefined;
        }

        if (best4 === undefined) continue;

        sumCr += credit;
        sum4 += best4 * credit;

        if (best4 < threshold) {
          cands.push({
            sem: hk,
            code: (c as any).code,
            name: (c as any).name,
            credit,
            current4: best4,
          });
        }
      }
    }

    if (sumCr === 0) {
      return {
        need: 0,
        suggestions: [],
        items: [],
        reached: false,
      };
    }

    const currentGpa4 = sum4 / sumCr;

    if (currentGpa4 >= threshold) {
      return {
        need: 0,
        suggestions: ['Bạn đã đạt mục tiêu với điểm trung bình tích lũy hiện tại.'],
        items: [],
        reached: true,
      };
    }

    if (!cands.length) {
      return {
        need: +(threshold - currentGpa4).toFixed(2),
        suggestions: ['Cần cải thiện điểm nhưng không có môn nào có thể nâng thêm.'],
        items: [],
        reached: false,
      };
    }

    // Sắp xếp: điểm thấp trước, tín chỉ cao trước
    cands.sort((a, b) => {
      if (a.current4 !== b.current4) return a.current4 - b.current4;
      return b.credit - a.credit;
    });

    // Greedy: chọn dần các môn có lợi nhất cho GPA tích lũy
    let neededExtra = threshold * sumCr - sum4;
    const chosen: Cand[] = [];

    for (const cand of cands) {
      if (neededExtra <= 0) break;
      const delta = (threshold - cand.current4) * cand.credit;
      if (delta <= 0) continue;
      chosen.push(cand);
      neededExtra -= delta;
    }

    const rung4eq: { val: number; letter: Letter }[] = [
      { val: 2.0, letter: 'C' }, { val: 2.5, letter: 'C+' },
      { val: 3.0, letter: 'B' }, { val: 3.5, letter: 'B+' },
      { val: 3.7, letter: 'A' }, { val: 4.0, letter: 'A+' },
    ];
    const targetLetter =
      rung4eq.find((r) => r.val >= threshold)?.letter || 'B+' as Letter;

    const items = chosen.map((c) => ({
      sem: c.sem,
      code: c.code,
      name: c.name,
      credit: c.credit,
      toLetter: targetLetter,
    }));

    const suggestions = items.map(
      (p) =>
        `Ưu tiên nâng [${p.sem}] ${p.code} – ${p.name} lên ≥ ${p.toLetter} (~${letterTo10[p.toLetter]}/10)`,
    );

    return {
      need: +Math.max(0, threshold - currentGpa4).toFixed(2),
      suggestions,
      items,
      reached: false,
    };
  }, [target, baseData, courses, semCourses, semesterKey, currentStudySem]);

  // Đồng bộ "kỳ học hiện tại" được chọn ở trang Tiến trình (lưu trong localStorage)
  useEffect(() => {
    const sync = () => {
      try {
        setCurrentStudySem(localStorage.getItem('currentStudySem') || undefined);
      } catch {
        setCurrentStudySem(undefined);
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('current-study-sem-changed', sync as any);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('current-study-sem-changed', sync as any);
    };
  }, []);

  return (
    <div className="container">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
          Kết quả học tập
        </Typography.Title>

        <div className="results-top" style={{ display: 'flex', gap: 8 }}>
          <Select
            options={semesterList}
            value={semesterKey}
            onChange={onChangeSemester}
            style={{ width: 120 }}
          />
          <Select
            allowClear
            placeholder={
              <span><AimOutlined style={{ color: '#b91c1c', marginRight: 6 }} />Đặt mục tiêu</span>
            }
            value={target as any}
            onChange={(v) => {
              const val = v as TargetKey | undefined;
              setTarget(val);
              try {
                if (val) {
                  localStorage.setItem('targetGoal', val);
                } else {
                  localStorage.removeItem('targetGoal');
                }
                window.dispatchEvent(new Event('target-goal-changed'));
              } catch {/* ignore */}
            }}
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
            {goalSuggestions.reached ? (
              <Typography.Text strong style={{ color: '#16a34a' }}>
                {goalSuggestions.suggestions[0] || 'Bạn đã đạt mục tiêu 🎉'}
              </Typography.Text>
            ) : (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Typography.Text strong style={{ color: 'var(--color-secondary)' }}>
                  Gợi ý cải thiện để đạt mục tiêu:
                </Typography.Text>
                <div className="suggest-rows">
                  {goalSuggestions.items.map((it) => {
                    const tag = letterTagColor(it.toLetter);
                    return (
                      <div key={`${it.sem ?? 'ALL'}-${it.code}-${it.toLetter}`} className="suggest-row">
                        <Tag className="suggest-tag" style={{ marginInline: 0 }}>
                          {it.sem ?? 'HK?'}
                        </Tag>
                        <Typography.Text className="suggest-code" strong>
                          {it.code}
                        </Typography.Text>
                        <Tag className="suggest-tag" style={{ marginInline: 0 }}>
                          {it.credit} tín
                        </Tag>
                        <Typography.Text className="suggest-name">
                          {it.name}
                        </Typography.Text>
                        <Tag color={tag.color} className="suggest-tag" style={{ marginInline: 0 }}>
                          ≥ {tag.text}
                        </Tag>
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
                <Typography.Text strong className="col-name">{c.name}</Typography.Text>
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
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      aria-label="Chỉnh sửa"
                      onClick={() => {
                        setEditingId(c.id);
                        editForm.setFieldsValue({ name: (c as any).name, credit: (c as any).credit });
                        setIsEditOpen(true);
                      }}
                    />
                    <Popconfirm
                      title="Xóa môn học"
                      description={`Bạn có chắc muốn xóa "${(c as any).name}"?`}
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => removeCourse(c.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} aria-label="Xóa" />
                    </Popconfirm>
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

        <Modal
          title="Chỉnh sửa môn học"
          open={isEditOpen}
          onCancel={() => { setIsEditOpen(false); setEditingId(null); editForm.resetFields(); }}
          onOk={async () => {
            try {
              const values = await editForm.validateFields();
              if (editingId) {
                // update local state
                const current = courses.find((x) => x.id === editingId);
                if (current) {
                  updateCourse(editingId, { name: values.name, credit: values.credit });
                  // persist to curriculum database (the update applies by course code across semesters)
                  updateCourseInCurriculum(specialization, { code: (current as any).code, name: values.name, credit: values.credit })
                    .then(() => { try { window.dispatchEvent(new Event('progress-override-changed')); } catch {} })
                    .catch(() => {/* ignore network errors for now */});
                }
              }
              setIsEditOpen(false);
              setEditingId(null);
              editForm.resetFields();
            } catch { /* ignore */ }
          }}
          okText="Lưu"
          cancelText="Hủy"
        >
          <Form form={editForm} layout="vertical">
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



