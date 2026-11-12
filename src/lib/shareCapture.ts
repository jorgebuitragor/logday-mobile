// "Compartir con Logday" (specs/captura-rapida/). Lógica pura: qué texto
// se propone al recibir algo compartido desde otra app y cómo se parte en
// título y contenido. El mismo criterio que la captura rápida de Desktop
// (`splitCapture` en task-manager/src/extensions/quick-capture/model.ts):
// la primera línea es el título y el resto, el contenido.

/** Proyecto de las tareas capturadas: la bandeja de entrada, el mismo que
 *  usa la captura rápida de Desktop. */
export const INBOX_PROJECT = 'inbox';

export interface SharedContent {
  text?: string | null;
  webUrl?: string | null;
  /** Título de la página que manda la otra app, si lo manda. */
  title?: string | null;
}

/** El texto que se pone en el formulario. Un enlace con título queda como
 *  "título\nenlace"; si el texto ya traía el enlace, no se repite. */
export function draftFromShare({ text, webUrl, title }: SharedContent): string {
  const body = (text ?? '').trim();
  const url = (webUrl ?? '').trim();
  const heading = (title ?? '').trim();
  const parts: string[] = [];
  if (heading && !body.startsWith(heading)) parts.push(heading);
  if (body) parts.push(body);
  if (url && !body.includes(url)) parts.push(url);
  return parts.join('\n');
}

/** La primera línea es el título y el resto, el contenido. `null` si no
 *  hay título. */
export function splitCapture(text: string): { title: string; content: string } | null {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^\s*\n/, '').split('\n');
  const title = lines[0].trim();
  if (!title) return null;
  return { title, content: lines.slice(1).join('\n').trim() };
}
