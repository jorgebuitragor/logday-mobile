import { describe, expect, it } from '@jest/globals';

import { draftFromShare, splitCapture } from './shareCapture';

describe('draftFromShare', () => {
  it('un enlace con título queda como título y enlace', () => {
    expect(draftFromShare({ text: 'https://logday.app/blog', webUrl: 'https://logday.app/blog', title: 'Blog de Logday' }))
      .toBe('Blog de Logday\nhttps://logday.app/blog');
  });

  it('no repite el enlace si el texto ya lo trae', () => {
    expect(draftFromShare({ text: 'Mira esto: https://x.co/a', webUrl: 'https://x.co/a' })).toBe('Mira esto: https://x.co/a');
  });

  it('texto suelto, sin enlace ni título', () => {
    expect(draftFromShare({ text: '  comprar pilas\npara el control  ' })).toBe('comprar pilas\npara el control');
  });

  it('nada compartido da texto vacío', () => {
    expect(draftFromShare({})).toBe('');
  });
});

describe('splitCapture', () => {
  it('primera línea título, el resto contenido', () => {
    expect(splitCapture('\n  Llamar a Ana \r\nsobre el sync\n\n')).toEqual({ title: 'Llamar a Ana', content: 'sobre el sync' });
  });

  it('sin título no hay captura', () => {
    expect(splitCapture('   ')).toBeNull();
  });
});
