export type Specialization = 'dev' | 'design';

export type SemesterKey = string; // e.g. 'HK1', 'HK2', '2023-2024-HK1'

export type CourseResult = {
  code: string;
  name: string;
  credit: number;
  grade?: number; // 0-10, optional
  status?: 'passed' | 'failed' | 'in-progress';
  // Some courses (e.g., Giáo dục quốc phòng) may not count toward total credits/GPA
  countInCredits?: boolean; // default true
  countInGpa?: boolean; // default true
  category?: string; // loại môn (bắt buộc chung, cơ sở ngành, chuyên ngành, ...)
};

export type SemesterData = {
  semester: SemesterKey;
  courses: CourseResult[];
};

export type ProgressData = {
  specialization: Specialization;
  semesters: SemesterData[];
};


