import { differenceInWeeks, parseISO, format, addWeeks } from 'date-fns';

export const TOTAL_WEEKS = 4000;

export function calculateWeeksLived(birthday: string): number {
  if (!birthday) return 0;
  const birthDate = parseISO(birthday);
  const today = new Date();
  return Math.max(0, differenceInWeeks(today, birthDate));
}

export function getWeekDate(birthday: string, weekIndex: number): string {
  const birthDate = parseISO(birthday);
  const weekDate = addWeeks(birthDate, weekIndex);
  return format(weekDate, 'MMM d, yyyy');
}

export function getYearFromWeek(birthday: string, weekIndex: number): number {
  const birthDate = parseISO(birthday);
  const weekDate = addWeeks(birthDate, weekIndex);
  return weekDate.getFullYear();
}

export function getCurrentFormattedDate(): string {
  return format(new Date(), 'MMM d').toUpperCase();
}
