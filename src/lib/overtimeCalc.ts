// Puerto exacto de task-manager/src/lib/overtimeCalc.ts — misma
// lógica minuto a minuto, mismos umbrales (diurno 06:00–19:00). No se
// cambió nada del algoritmo, solo el import de holidays a la versión
// mínima portada en ./colombianHolidays.

import { getColombianHolidays } from './colombianHolidays';

function isFestiveDay(fecha: string): boolean {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getDay() === 0) return true; // domingo
  const holidays = getColombianHolidays(year);
  return holidays.has(fecha);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export interface OvertimeBreakdown {
  totalHoras: number;
  extrasDiurnas: number;
  extrasNocturnas: number;
  extrasDiurnasFestivas: number;
  extrasNocturnasFestivas: number;
}

export function calcOvertimeBreakdown(
  fecha: string,
  horaInicio: string,
  horaFinal: string
): OvertimeBreakdown {
  const startMin = timeToMinutes(horaInicio);
  let endMin = timeToMinutes(horaFinal);
  if (endMin <= startMin) endMin += 24 * 60; // cruce de medianoche

  const festive = isFestiveDay(fecha);
  const [year, month, day] = fecha.split('-').map(Number);
  const nextDate = new Date(year, month - 1, day + 1);
  const nextFecha = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
  const nextFestive = isFestiveDay(nextFecha);

  let diurnas = 0;
  let nocturnas = 0;
  let diurnasFestivas = 0;
  let nocturnasFestivas = 0;

  for (let m = startMin; m < endMin; m++) {
    const minuteInDay = m % (24 * 60);
    const isDiurno = minuteInDay >= 360 && minuteInDay < 1140;
    const currentFestive = m < 24 * 60 ? festive : nextFestive;

    if (isDiurno) {
      if (currentFestive) diurnasFestivas++;
      else diurnas++;
    } else {
      if (currentFestive) nocturnasFestivas++;
      else nocturnas++;
    }
  }

  const totalMinutes = endMin - startMin;
  const toHours = (mins: number) => Math.round((mins / 60) * 100) / 100;

  return {
    totalHoras: toHours(totalMinutes),
    extrasDiurnas: toHours(diurnas),
    extrasNocturnas: toHours(nocturnas),
    extrasDiurnasFestivas: toHours(diurnasFestivas),
    extrasNocturnasFestivas: toHours(nocturnasFestivas),
  };
}
