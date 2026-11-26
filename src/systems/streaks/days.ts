/**
 * Local-calendar day maths on 'YYYY-MM-DD' keys (the same format as core's dayKey).
 * Dates are built at local noon so DST shifts never move a day.
 */
import { dayKey, type Locale } from '@core';
import { MONTHS_HE } from './strings';

const DAY_MS = 86_400_000;

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function isDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Whole days from a to b (b later → positive). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY_MS);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d.getTime());
}

/** Day keys strictly between a and b (exclusive both ends). */
export function daysStrictlyBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const gap = daysBetween(a, b);
  for (let i = 1; i < gap; i++) out.push(addDays(a, i));
  return out;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMon(key: string): number {
  return (parseDay(key).getDay() + 6) % 7;
}

/** 0 = Sunday … 6 = Saturday (the Israeli week). */
export function weekdaySun(key: string): number {
  return parseDay(key).getDay();
}

export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** `weeks` rows of Monday-first day keys, the last row containing `today`. */
export function calendarWeeks(today: string, weeks = 5, startOn: 'mon' | 'sun' = 'mon'): string[][] {
  const lastMonday = addDays(today, -(startOn === 'sun' ? weekdaySun(today) : weekdayMon(today)));
  const first = addDays(lastMonday, -7 * (weeks - 1));
  const rows: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) row.push(addDays(first, w * 7 + d));
    rows.push(row);
  }
  return rows;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(key: string, locale: Locale = 'en'): string {
  const d = parseDay(key);
  return `${d.getDate()} ${(locale === 'he' ? MONTHS_HE : MONTHS)[d.getMonth()]}`;
}
