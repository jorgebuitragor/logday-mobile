// Versión simplificada de task-manager/src/lib/colombianHolidays.ts
// (buildDailyCopyText): mismo formato de mensaje, sin el nombre del
// día de la semana en español (ahí desktop formatea "Lunes 12 de
// enero" a mano) — se usa la fecha ISO tal cual. Reducción de alcance
// deliberada, ver specs/pantalla-dailys/design.md.
export function buildDailyCopyText(
  previousDate: string | null,
  previousContent: string,
  date: string,
  content: string
): string {
  const today = content.trim() || '- (sin actividades registradas)';
  const lines = ['Buenos días.', ''];
  if (previousDate) {
    const prev = previousContent.trim() || '- (sin actividades registradas)';
    lines.push(`El día ${previousDate}:`, prev, '');
  }
  lines.push(`El día de hoy, ${date}:`, today);
  return lines.join('\n');
}
