import { differenceInWeeks, parseISO, format, addWeeks, addDays } from 'date-fns';

export const TOTAL_WEEKS = 4000;

export function calculateWeeksLived(birthday: string): number {
  if (!birthday) return 0;
  const birthDate = parseISO(birthday);
  const today = new Date();
  return Math.max(0, differenceInWeeks(today, birthDate));
}

export function getWeekDate(birthday: string, weekIndex: number): string {
  const birthDate = parseISO(birthday);
  const weekStart = addWeeks(birthDate, weekIndex);
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'EEE, MMM d, yyyy')} - ${format(weekEnd, 'EEE, MMM d, yyyy')}`;
}

export function getWeekStartDate(birthday: string, weekIndex: number): string {
  const birthDate = parseISO(birthday);
  const weekStart = addWeeks(birthDate, weekIndex);
  return format(weekStart, 'MMM d, yyyy');
}

export function getYearFromWeek(birthday: string, weekIndex: number): number {
  const birthDate = parseISO(birthday);
  const weekDate = addWeeks(birthDate, weekIndex);
  return weekDate.getFullYear();
}

export function getCurrentFormattedDate(): string {
  return format(new Date(), 'MMM d').toUpperCase();
}
