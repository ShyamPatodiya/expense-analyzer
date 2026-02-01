import { format, parse, isValid, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Common date formats found in bank statements (date-only and datetime)
 */
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd.MM.yyyy',
  'd/M/yyyy',
  'dd/MM/yy',
  'dd-MMM-yyyy', // Excel: 21-Sep-2025
  'd-MMM-yyyy',
  // With time
  'd/M/yyyy H:mm',
  'dd/MM/yyyy HH:mm',
  'dd-MM-yyyy HH:mm:ss',
  'dd-MM-yyyy H:mm:ss',
  'd/M/yyyy H:mm:ss',
  'dd-MM-yyyy',
  'd-M-yyyy H:mm:ss',
  'd/M/yyyy h:mm a',
];

/**
 * Parse a date string using common formats.
 * Returns null if parsing fails.
 */
export function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  // Fallback to native Date parse
  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date): string {
  return format(date, 'dd MMM yyyy');
}

/**
 * Get start and end of current month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Get date range for "Last 3 Months" preset
 */
export function getLastThreeMonthsRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = subMonths(end, 2);
  return {
    start: startOfMonth(start),
    end: endOfMonth(end),
  };
}

/**
 * Format month key for grouping (e.g. "2025-01")
 */
export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}
