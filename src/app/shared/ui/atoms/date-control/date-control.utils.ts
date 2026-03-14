export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function addDays(base: Date, amount: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + amount);
  return startOfDay(next);
}

export function parseIsoDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  const parsed = new Date(parsedYear, parsedMonth - 1, parsedDay);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getFullYear() !== parsedYear ||
    parsed.getMonth() !== parsedMonth - 1 ||
    parsed.getDate() !== parsedDay
  ) {
    return null;
  }

  return startOfDay(parsed);
}

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarStart(month: Date): Date {
  const first = startOfMonth(month);
  const weekday = (first.getDay() + 6) % 7;
  return addDays(first, -weekday);
}

export function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function isDisabled(value: Date, min: Date | null, max: Date | null): boolean {
  if (min && value < min) {
    return true;
  }

  if (max && value > max) {
    return true;
  }

  return false;
}
