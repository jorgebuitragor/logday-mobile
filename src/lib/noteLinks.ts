// Qué enlaces de una nota se pueden abrir desde la vista previa (M-08 de
// la auditoría del 9 nov 2026). Sin esto, `react-native-markdown-display`
// le pasaba cualquier URL a `Linking.openURL`, incluidos `intent://`,
// `tel:`, `sms:` o el esquema de otra app instalada. El contenido de una
// nota puede venir de otro cliente por sync o de un texto pegado, así que
// no es de confianza.
//
// Solo se abren enlaces web y de correo. `markdown-it` ya descarta
// `javascript:`, `vbscript:`, `file:` y `data:` al parsear; esta lista
// cubre lo demás. Una URL sin esquema (relativa) tampoco se abre: no hay
// una página base contra la cual resolverla.

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

/** El esquema de la URL en minúsculas, o null si no tiene. */
export function linkScheme(url: string): string | null {
  const match = /^\s*([a-z][a-z0-9+.-]*):/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

export function isAllowedLink(url: string): boolean {
  const scheme = linkScheme(url);
  return scheme !== null && ALLOWED_SCHEMES.has(scheme);
}
