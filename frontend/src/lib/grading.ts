export type Letter = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';

// Quy đổi điểm 10 → điểm chữ
export function letterFrom10(grade10: number | undefined): Letter | undefined {
  if (grade10 === undefined || grade10 === null) return undefined;
  if (grade10 >= 9.0) return 'A+';
  if (grade10 >= 8.5) return 'A';
  if (grade10 >= 8.0) return 'B+';
  if (grade10 >= 7.0) return 'B';
  if (grade10 >= 6.5) return 'C+';
  if (grade10 >= 5.5) return 'C';
  if (grade10 >= 5.0) return 'D+';
  if (grade10 >= 4.0) return 'D';
  return 'F';
}

// Quy đổi điểm 10 → thang 4
export function fourFrom10(grade10: number | undefined): number | undefined {
  if (grade10 === undefined || grade10 === null) return undefined;
  if (grade10 >= 9.0) return 4.0;
  if (grade10 >= 8.5) return 3.7;
  if (grade10 >= 8.0) return 3.5;
  if (grade10 >= 7.0) return 3.0;
  if (grade10 >= 6.5) return 2.5;
  if (grade10 >= 5.5) return 2.0;
  if (grade10 >= 5.0) return 1.5;
  if (grade10 >= 4.0) return 1.0;
  return 0.0;
}

// Khi người dùng chọn điểm chữ, cần giá trị số để tính GPA thang 10
// Quy đổi điểm chữ → 10 (dùng trung điểm của mỗi khoảng để tránh thiên lệch)
export const letterTo10: Record<Letter, number> = {
  'A+': 9.5,   // 9.0 – 10.0 → ~9.5
  A: 8.7,      // 8.5 – 8.9 → ~8.7
  'B+': 8.2,   // 8.0 – 8.4 → ~8.2
  B: 7.45,     // 7.0 – 7.9 → ~7.45
  'C+': 6.7,   // 6.5 – 6.9 → ~6.7
  C: 5.95,     // 5.5 – 6.4 → ~5.95
  'D+': 5.2,   // 5.0 – 5.4 → ~5.2
  D: 4.45,     // 4.0 – 4.9 → ~4.45
  F: 0,
};

export const letterTo4: Record<Letter, number> = {
  'A+': 4.0,
  A: 3.7,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  'D+': 1.5,
  D: 1.0,
  F: 0.0,
};

// Xếp hạng học lực theo GPA thang 4
export function rankFrom4(gpa4: number): 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Kém' {
  if (gpa4 >= 3.6) return 'Xuất sắc';
  if (gpa4 >= 3.2) return 'Giỏi';
  if (gpa4 >= 2.5) return 'Khá';
  if (gpa4 >= 2.0) return 'Trung bình';
  if (gpa4 >= 1.0) return 'Yếu';
  return 'Kém';
}


