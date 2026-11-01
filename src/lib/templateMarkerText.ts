import { splitTemplate } from './templates/dailyTemplate';

// El editor de la plantilla propia del Daily (Ajustes → Plantillas) no
// muestra `{{anterior.fecha}}`: cada marcador se ve como un recuadro de
// color con su nombre. Un `TextInput` de React Native solo tiene texto, así
// que el recuadro es texto con fondo, `«Nombre»`. Estas funciones pasan de
// la plantilla guardada (`{{clave}}`) a lo que se ve y de vuelta.

const OPEN = '«';
const CLOSE = '»';

export type MarkerLabels = Record<string, string>;

export type DisplaySegment = { kind: 'text'; text: string } | { kind: 'marker'; name: string; text: string };

/** Lo que se ve, en tramos: los marcadores conocidos como `«Nombre»`; los
 *  desconocidos y las secciones quedan como texto, tal cual. */
export function toDisplaySegments(template: string, labels: MarkerLabels): DisplaySegment[] {
  return splitTemplate(template).map((part) => {
    if (part.kind === 'text') return part;
    const label = labels[part.name];
    return label === undefined ? { kind: 'text', text: `{{${part.name}}}` } : { kind: 'marker', name: part.name, text: `${OPEN}${label}${CLOSE}` };
  });
}

export function toDisplay(template: string, labels: MarkerLabels): string {
  return toDisplaySegments(template, labels).map((s) => s.text).join('');
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** De vuelta a la plantilla: cada `«Nombre»` que coincide exactamente con
 *  un marcador pasa a `{{clave}}`. Lo editado por dentro queda como texto. */
export function fromDisplay(display: string, labels: MarkerLabels): string {
  const entries = Object.entries(labels).sort(([, a], [, b]) => b.length - a.length);
  if (!entries.length) return display;
  const byLabel = new Map(entries.map(([key, label]) => [label, key]));
  const re = new RegExp(entries.map(([, label]) => escapeRegex(`${OPEN}${label}${CLOSE}`)).join('|'), 'g');
  return display.replace(re, (m) => `{{${byLabel.get(m.slice(OPEN.length, -CLOSE.length))}}}`);
}

/** Restos de recuadros editados por dentro (`«Tu nombr»`): no son un
 *  marcador y salen tal cual al copiar, así que se avisan como desconocidos. */
export function strayLabels(template: string): string[] {
  return [...new Set([...template.matchAll(/«[^\n]*?»/g)].map((m) => m[0]))];
}
