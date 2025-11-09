import type { ProgressData } from '../types/progress';

export async function fetchCurriculum(spec: 'dev' | 'design'): Promise<ProgressData> {
  const res = await fetch(`/api/curriculum/${encodeURIComponent(spec)}`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  const semesters = (data?.semesters ?? []).map((s: any) => ({
    semester: s.semester,
    courses: (s.courses ?? []).map((c: any) => ({
      code: c.code,
      name: c.name,
      credit: c.credit,
      countInGpa: c.countInGpa !== false,
      countInCredits: c.countInCredits !== false,
    })),
  }));
  return { specialization: data?.specialization ?? spec, semesters } as ProgressData;
}

export async function addCourseToCurriculum(spec: 'dev' | 'design', semester: string, course: { code: string; name: string; credit: number; countInGpa?: boolean; countInCredits?: boolean }) {
  const res = await fetch(`/api/curriculum/${encodeURIComponent(spec)}/course`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ semester, ...course }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCourseInCurriculum(
  spec: 'dev' | 'design',
  update: { code: string; name?: string; credit?: number; countInGpa?: boolean; countInCredits?: boolean }
) {
  const res = await fetch(`/api/curriculum/${encodeURIComponent(spec)}/course`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCourseInCurriculum(spec: 'dev' | 'design', code: string) {
  const url = `/api/curriculum/${encodeURIComponent(spec)}/course?code=${encodeURIComponent(code)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type CurriculumCourse = {
  code: string;
  name: string;
  credit: number;
  countInGpa?: boolean;
  countInCredits?: boolean;
};

export type CurriculumDoc = {
  specialization: string;
  name: string;
  semesters: { semester: string; courses: CurriculumCourse[] }[];
};

async function getJson(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCurriculumAsProgress(specialization: string): Promise<ProgressData> {
  const rs = await getJson(`/api/curriculum/${encodeURIComponent(specialization)}`) as CurriculumDoc;
  const progress: ProgressData = {
    specialization: rs.specialization as any,
    semesters: rs.semesters.map((s) => ({
      semester: s.semester,
      courses: s.courses.map((c) => ({
        code: c.code,
        name: c.name,
        credit: c.credit,
        countInGpa: c.countInGpa !== false,
        countInCredits: c.countInCredits !== false,
        // grade/status không có ở curriculum -> để undefined
      })),
    })),
  };
  return progress;
}


