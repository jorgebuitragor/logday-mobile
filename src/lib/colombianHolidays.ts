// Puerto mínimo de task-manager/src/lib/colombianHolidays.ts — solo lo
// que necesita overtimeCalc.ts (getColombianHolidays, toISO). No se
// portó el resto del archivo (isWorkingDay, getPreviousWorkingDay,
// buildDailyCopyText, etc.) porque nada en mobile lo usa todavía.

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mo, day, 12, 0, 0);
}

function toNextMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 1) return d;
  d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow));
  return d;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function getColombianHolidays(year: number): Set<string> {
  const h = new Set<string>();

  h.add(`${year}-01-01`);
  h.add(`${year}-05-01`);
  h.add(`${year}-07-20`);
  h.add(`${year}-08-07`);
  h.add(`${year}-12-08`);
  h.add(`${year}-12-25`);

  [
    new Date(year, 0, 6),
    new Date(year, 2, 19),
    new Date(year, 5, 29),
    new Date(year, 7, 15),
    new Date(year, 9, 12),
    new Date(year, 10, 1),
    new Date(year, 10, 11),
  ].forEach((d) => h.add(toISO(toNextMonday(d))));

  const easter = easterDate(year);
  h.add(toISO(addDays(easter, -3)));
  h.add(toISO(addDays(easter, -2)));
  h.add(toISO(toNextMonday(addDays(easter, 39))));
  h.add(toISO(toNextMonday(addDays(easter, 60))));
  h.add(toISO(toNextMonday(addDays(easter, 68))));

  return h;
}
