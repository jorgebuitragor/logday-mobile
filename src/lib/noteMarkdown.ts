import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

// `Note.content` se guarda como markdown (mismo formato que desktop,
// ver `NoteEditor.tsx` de task-manager: `tiptap-markdown` serializa el
// documento de TipTap a markdown en cada cambio). El editor de mobile
// (`@10play/tentap-editor`) no habla markdown de forma nativa — su
// bridge solo da `getHTML()`/`setContent(html)` — así que la
// conversión markdown ⇄ HTML se hace acá, en JS plano, en el borde de
// guardado/carga, en vez de escribir una bridge extension propia para
// el editor (que requeriría "advanced setup" y probablemente forzaría
// a dejar Expo Go — ver specs/editor-notas/design.md).

const md = new MarkdownIt({ html: false, breaks: false, linkify: true });

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return '';
  return md.render(markdown);
}

export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return turndown.turndown(html).trim();
}
