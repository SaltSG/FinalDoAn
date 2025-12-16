export type Specialization = 'dev' | 'design';

export type SemesterKey = string;

export type CourseResult = {
  code: string;
  name: string;
  credit: number;
  grade?: number;
  status?: 'passed' | 'failed' | 'in-progress';
  countInCredits?: boolean;
  countInGpa?: boolean;
  category?: string;
};

export type SemesterData = {
  semester: SemesterKey;
  courses: CourseResult[];
};

export type ProgressData = {
  specialization: Specialization;
  semesters: SemesterData[];
};


