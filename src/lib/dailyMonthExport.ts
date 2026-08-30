import MarkdownIt from 'markdown-it';
import * as Print from 'expo-print';

import { sharePdfFile, shareTextFile } from './exportFile';

// Mismos 3 formatos que el export de mes de Dailys en desktop
// (`dailyMonthExport.ts`), ver specs/exportacion/. `entries` es una
// lista de pares [fecha, contenido] de un solo mes, en orden
// cronológico ascendente (a diferencia de `listDailyEntries`, que
// devuelve todo en orden descendente para el listado) — mismo
// criterio de orden que usa desktop antes de llamar a su función
// equivalente (`DailyList.tsx`: `.sort(([a],[b]) => a.localeCompare(b))`).
export type DailyMonthExportFormat = 'md' | 'txt' | 'pdf';

const md = new MarkdownIt({ html: false, breaks: false, linkify: true });

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mismo formato exacto que `exportDailyMonthEntries` de desktop:
// encabezado "# label" (o subrayado con "=" en texto plano), cada día
// como "## fecha" (o subrayado con "-"), separados por "---".
export function buildDailyMonthDoc(label: string, entries: [string, string][], format: 'md' | 'txt'): string {
  const ismd = format === 'md';
  const header = ismd ? `# ${label}\n\n` : `${label}\n${'='.repeat(label.length)}\n\n`;
  const body = entries
    .map(([date, content]) =>
      ismd ? `## ${date}\n\n${content}` : `${date}\n${'-'.repeat(date.length)}\n${content}`
    )
    .join('\n\n---\n\n');
  return header + body + '\n';
}

// El contenido de un daily es una lista de actividades en formato
// "- item1\n- item2" (ver `DailyActivityList.tsx`/`parseActivityItems`)
// — markdown válido de por sí, así que `markdown-it` lo renderiza
// como una lista real con viñetas en vez de mostrar los guiones
// crudos, mismo criterio que el PDF de una nota (ver noteExport.ts).
function buildPdfHtml(label: string, entries: [string, string][]): string {
  const body = entries
    .map(([date, content]) => `<h2>${escapeHtml(date)}</h2>\n${md.render(content || '')}`)
    .join('<hr/>');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, sans-serif; padding: 32px; color: #111827; line-height: 1.5; }
  h1 { font-size: 24px; margin-bottom: 16px; }
  h2 { font-size: 17px; margin-top: 20px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  code { background: #f3f4f6; border-radius: 4px; padding: 2px 5px; font-family: Courier, monospace; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 12px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 3px solid #d1d5db; margin-left: 0; padding-left: 14px; color: #4b5563; }
</style>
</head>
<body>
<h1>${escapeHtml(label)}</h1>
${body}
</body>
</html>`;
}

export async function exportDailyMonth(
  yearMonth: string,
  label: string,
  entries: [string, string][],
  format: DailyMonthExportFormat
): Promise<void> {
  const baseName = `dailys-${yearMonth}`;
  if (format === 'md') {
    await shareTextFile(`${baseName}.md`, buildDailyMonthDoc(label, entries, 'md'), 'text/markdown');
    return;
  }
  if (format === 'txt') {
    await shareTextFile(`${baseName}.txt`, buildDailyMonthDoc(label, entries, 'txt'), 'text/plain');
    return;
  }
  const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(label, entries) });
  await sharePdfFile(uri, `${baseName}.pdf`);
}
