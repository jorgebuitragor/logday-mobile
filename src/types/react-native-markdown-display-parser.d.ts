// El parser interno de `react-native-markdown-display` (texto → árbol, sin
// React Native). Solo lo usa src/lib/markdownRender.test.ts; la librería no
// publica tipos para esta ruta.
declare module 'react-native-markdown-display/src/lib/parser' {
  import type MarkdownIt from 'markdown-it';

  export default function parser<T>(source: string, renderer: (tree: unknown) => T, markdownIt: MarkdownIt): T;
}
