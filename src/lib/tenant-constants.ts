export const DEMO_SCHOOL_SLUG = 'kaizen-bjj';

export const DISCIPLINE_RECEIPT_CODES: Record<string, string> = {
  brazilian_jiu_jitsu: 'BJJ',
  judo: 'JUDO',
  karate: 'KT',
  taekwondo: 'TKD',
  muay_thai: 'MT',
  krav_maga: 'KM'
};

export function getReceiptDisciplineCode(discipline: string): string {
  return DISCIPLINE_RECEIPT_CODES[discipline] ?? 'BJJ';
}

export function formatReceiptSlug(year: number, disciplineCode: string, increment: number): string {
  return `REC-${year}-${disciplineCode}-${String(increment).padStart(4, '0')}`;
}
