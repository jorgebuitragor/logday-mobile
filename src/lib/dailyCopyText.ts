// El mensaje de siempre del Daily: igual que `buildDailyCopyText` de
// task-manager/src/lib/colombianHolidays.ts (Desktop) y Web, con el día en
// letras ("Viernes 30 de Octubre"). Es lo que sale con la plantilla de
// Logday (ver specs/plantillas/). Se reexporta desde colombianHolidays.ts
// para que src/lib/templates/ importe igual que en Desktop.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function dayLabel(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/**
 * Genera el texto formateado del daily para copiar al canal del equipo.
 *
 * Formato:
 * Buenos días.
 *
 * El día [DayName] [Day] de [Month]:
 * [prevActivities]
 *
 * El día de hoy, [DayName] [Day] de [Month]:   (o "El día …:" si no es hoy)
 * [todayActivities]
 */
export function buildDailyCopyText(
  prevDate: Date,
  prevActivities: string,
  todayDate: Date,
  todayActivities: string
): string {
  const prev = prevActivities.trim() || '- (sin actividades registradas)';
  const today = todayActivities.trim() || '- (sin actividades aún)';
  const realToday = new Date();
  const isToday =
    todayDate.getFullYear() === realToday.getFullYear() &&
    todayDate.getMonth() === realToday.getMonth() &&
    todayDate.getDate() === realToday.getDate();
  const todayLabel = isToday
    ? `El día de hoy, ${dayLabel(todayDate)}:`
    : `El día ${dayLabel(todayDate)}:`;
  return [
    'Buenos días.',
    '',
    `El día ${dayLabel(prevDate)}:`,
    prev,
    '',
    todayLabel,
    today,
  ].join('\n');
}
