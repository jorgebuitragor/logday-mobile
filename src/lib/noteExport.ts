import MarkdownIt from 'markdown-it';
import * as Print from 'expo-print';

import { sanitizeFilename, sharePdfFile, shareTextFile } from './exportFile';

// Mismos 3 formatos que el modal "Exportar" de una nota en desktop
// (`ExportModal.tsx`/`exportNote.ts`): Markdown, texto plano, PDF —
// ver specs/exportacion/design.md para por qué el PDF acá usa
// `expo-print` (HTML → PDF) en vez del renderer manual bloque-por-
// bloque con jsPDF que usa desktop.
export type NoteExportFormat = 'md' | 'txt' | 'pdf';

const md = new MarkdownIt({ html: false, breaks: false, linkify: true });

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mismo criterio que `handleCopy`/`exportNote` de desktop: con título,
// antepone "# título"; sin título, el contenido solo. Exportada
// porque `NoteActionsSheet`'s "Copiar" (app/note/[id].tsx) usa
// exactamente el mismo formato para copiar al portapapeles.
export function buildMarkdownDoc(title: string, content: string): string {
  const trimmedTitle = title.trim();
  return trimmedTitle ? `# ${trimmedTitle}\n\n${content}`.trim() : content.trim();
}

function buildPlainDoc(title: string, content: string): string {
  const trimmedTitle = title.trim();
  return trimmedTitle ? `${trimmedTitle}\n\n${content}`.trim() : content.trim();
}

function buildPdfHtml(title: string, content: string): string {
  const bodyHtml = md.render(content || '');
  const titleHtml = title.trim() ? `<h1>${escapeHtml(title.trim())}</h1>` : '';
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, sans-serif; padding: 32px; color: #111827; line-height: 1.5; }
  h1 { font-size: 24px; margin-bottom: 16px; }
  h2 { font-size: 20px; }
  h3 { font-size: 17px; }
  code { background: #f3f4f6; border-radius: 4px; padding: 2px 5px; font-family: Courier, monospace; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 12px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 3px solid #d1d5db; margin-left: 0; padding-left: 14px; color: #4b5563; }
  a { color: #4f46e5; }
</style>
</head>
<body>
${titleHtml}
${bodyHtml}
</body>
</html>`;
}

export async function exportNote(title: string, content: string, format: NoteExportFormat): Promise<void> {
  const baseName = sanitizeFilename(title || 'nota');

  if (format === 'md') {
    await shareTextFile(`${baseName}.md`, buildMarkdownDoc(title, content), 'text/markdown');
    return;
  }
  if (format === 'txt') {
    await shareTextFile(`${baseName}.txt`, buildPlainDoc(title, content), 'text/plain');
    return;
  }
  const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(title, content) });
  await sharePdfFile(uri, `${baseName}.pdf`);
}
