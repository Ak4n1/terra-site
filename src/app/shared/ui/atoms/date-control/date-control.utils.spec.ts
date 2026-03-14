import { describe, expect, it } from 'vitest';
import { addDays, calendarStart, isDisabled, parseIsoDate, startOfMonth, toIsoDate } from './date-control.utils';

describe('date-control utils', () => {
  describe('parseIsoDate', () => {
    it('accepts valid leap day dates', () => {
      const parsed = parseIsoDate('2028-02-29');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2028);
      expect(parsed?.getMonth()).toBe(1);
      expect(parsed?.getDate()).toBe(29);
    });

    it('rejects invalid leap day dates', () => {
      expect(parseIsoDate('2027-02-29')).toBeNull();
      expect(parseIsoDate('1900-02-29')).toBeNull();
    });

    it('accepts century leap day when valid', () => {
      const parsed = parseIsoDate('2000-02-29');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2000);
      expect(parsed?.getMonth()).toBe(1);
      expect(parsed?.getDate()).toBe(29);
    });

    it('rejects impossible calendar days', () => {
      expect(parseIsoDate('2026-04-31')).toBeNull();
      expect(parseIsoDate('2026-02-31')).toBeNull();
      expect(parseIsoDate('2026-13-01')).toBeNull();
    });
  });

  describe('calendarStart', () => {
    it('starts the grid on monday for a month starting on sunday', () => {
      const start = calendarStart(new Date(2026, 2, 1));
      expect(toIsoDate(start)).toBe('2026-02-23');
      expect(start.getDay()).toBe(1);
    });

    it('starts the grid on the same day when month already starts on monday', () => {
      const start = calendarStart(new Date(2027, 10, 1));
      expect(toIsoDate(start)).toBe('2027-11-01');
      expect(start.getDay()).toBe(1);
    });
  });

  describe('month day counts through native progression', () => {
    it('covers february 2028 with 29 days', () => {
      const month = startOfMonth(new Date(2028, 1, 14));
      const firstOfNextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const lastDay = addDays(firstOfNextMonth, -1);
      expect(lastDay.getDate()).toBe(29);
    });

    it('covers february 2027 with 28 days', () => {
      const month = startOfMonth(new Date(2027, 1, 14));
      const firstOfNextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const lastDay = addDays(firstOfNextMonth, -1);
      expect(lastDay.getDate()).toBe(28);
    });

    it('covers april with 30 days and may with 31 days', () => {
      const aprilLast = addDays(new Date(2026, 4, 1), -1);
      const mayLast = addDays(new Date(2026, 5, 1), -1);
      expect(aprilLast.getDate()).toBe(30);
      expect(mayLast.getDate()).toBe(31);
    });
  });

  describe('isDisabled', () => {
    it('respects min and max boundaries', () => {
      const min = parseIsoDate('2026-03-10');
      const max = parseIsoDate('2026-03-20');
      expect(isDisabled(new Date(2026, 2, 9), min, max)).toBe(true);
      expect(isDisabled(new Date(2026, 2, 10), min, max)).toBe(false);
      expect(isDisabled(new Date(2026, 2, 20), min, max)).toBe(false);
      expect(isDisabled(new Date(2026, 2, 21), min, max)).toBe(true);
    });
  });
});
