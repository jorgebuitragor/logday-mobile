import { describe, expect, it } from '@jest/globals';
import MarkdownIt from 'markdown-it';
// El parser de la librería no importa React Native: es lo que convierte el
// texto en el árbol que después se pinta con Text/View.
import parser from 'react-native-markdown-display/src/lib/parser';

import fixture from './__fixtures__/markdownRender.json';

// U-04 de la auditoría del 9 nov 2026: `react-native-markdown-display`
// 7.0.2 (sin mantenimiento desde 2023) pide `markdown-it` ^10, que tiene
// avisos de DoS. `package.json` lo fuerza a la misma versión que usa la
// app (`overrides`). Esta prueba comprueba que el árbol que arma la
// librería para lo que se escribe en una nota es el mismo que con la
// versión 10: el fixture se generó con `markdown-it` 10.0.0 y sus
// diferencias reales, si las hay, están anotadas abajo.

// Lo que la vista previa le pasa a la librería: su `markdownit` por defecto.
const md = MarkdownIt({ typographer: true });

/** El árbol sin las claves aleatorias que la librería genera por nodo.
 *  Única diferencia real entre las versiones: desde `markdown-it` 13, el
 *  ítem de una lista numerada trae su número en `info` (`sourceInfo` en el
 *  árbol). La regla `list_item` de la librería no lo lee: numera por
 *  posición y por el `start` de la lista, así que se ignora. */
function ast(source: string): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === 'object') {
      const isListItem = (node as { type?: unknown }).type === 'list_item';
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .filter(([k]) => k !== 'key' && !(isListItem && k === 'sourceInfo'))
          .map(([k, v]) => [k, strip(v)])
      );
    }
    return node;
  };
  return strip(parser(source, (tree: unknown) => tree, md));
}

export const CORPUS: Record<string, string> = {
  encabezados: '# Uno\n## Dos\n### Tres\n#### Cuatro\n##### Cinco\n###### Seis',
  enfasis: 'Texto con **negrita**, *cursiva*, ~~tachado~~ y `código`.',
  listas: '- uno\n- dos\n  - anidado\n  - otro\n- tres\n\n1. primero\n2. segundo\n   1. sub',
  tareas: '- [ ] pendiente\n- [x] hecha',
  cita: '> una cita\n> de dos líneas\n>\n> > anidada',
  codigo: '```ts\nconst a = 1;\n```\n\n    indentado\n',
  enlaces: '[web](https://logday.app) y [correo](mailto:ana@ejemplo.com) y <https://auto.link> y https://sin.marcas',
  enlacesRaros: '[x](javascript:alert(1)) [y](intent://scan#Intent;end) [z](/relativo)',
  imagen: '![logo](https://logday.app/logo.png "título")',
  tabla: '| a | b |\n|---|:-:|\n| 1 | 2 |',
  tipografia: '"comillas" y \'simples\' -- guiones --- (c) ... ',
  html: '<b>negrita html</b> y <script>alert(1)</script>',
  separadores: 'arriba\n\n---\n\nabajo  \ncon salto',
  mezcla: '## Daily\n\n- revisé **el sync**\n- pendiente: [PR](https://github.com/x/y/pull/1)\n\n> nota: `npm test`',
};

describe('versión de markdown-it', () => {
  it('la librería de render usa la misma copia que la app, sin avisos conocidos', () => {
    const fromLibrary = require.resolve('markdown-it', { paths: [require.resolve('react-native-markdown-display/package.json')] });
    expect(fromLibrary).toBe(require.resolve('markdown-it'));
    const [major, minor, patch] = (require('markdown-it/package.json') as { version: string }).version.split('.').map(Number);
    expect(major * 1e6 + minor * 1e3 + patch).toBeGreaterThanOrEqual(15_000_003);
  });
});

describe('árbol de la vista previa con markdown-it al día', () => {
  it.each(Object.keys(CORPUS))('%s', (name) => {
    expect(ast(CORPUS[name])).toEqual((fixture as Record<string, unknown>)[name]);
  });
});
