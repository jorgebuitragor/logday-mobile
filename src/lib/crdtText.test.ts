import { describe, expect, it } from '@jest/globals';
import * as Y from 'yjs';

import {
  applyEditorEdit, applyIncomingUpdate, applyTextEdit, docFromStateB64, encodeDocStateB64, getContentText,
  mapTextIndex, rebaseText, syncEditorText, type EditorTextState,
} from './crdtText';

function docWith(text: string): Y.Doc {
  const doc = new Y.Doc();
  applyTextEdit(doc, text);
  return doc;
}

/** Dos clientes que parten del mismo estado. */
function fork(text: string): [Y.Doc, Y.Doc] {
  const a = docWith(text);
  const b = docFromStateB64(encodeDocStateB64(a));
  return [a, b];
}

function exchange(a: Y.Doc, b: Y.Doc): void {
  const fromA = encodeDocStateB64(a);
  const fromB = encodeDocStateB64(b);
  applyIncomingUpdate(a, fromB);
  applyIncomingUpdate(b, fromA);
}

describe('estado persistido', () => {
  it('ida y vuelta por base64 conserva el texto', () => {
    const doc = docWith('línea con tildes y emoji 🙂');
    expect(getContentText(docFromStateB64(encodeDocStateB64(doc)))).toBe('línea con tildes y emoji 🙂');
    expect(getContentText(docFromStateB64(null))).toBe('');
  });

  it('aplicar el mismo update dos veces no duplica nada', () => {
    const [a, b] = fork('hola');
    applyTextEdit(a, 'hola mundo');
    const update = encodeDocStateB64(a);
    applyIncomingUpdate(b, update);
    applyIncomingUpdate(b, update);
    expect(getContentText(b)).toBe('hola mundo');
  });
});

describe('merge de ediciones concurrentes', () => {
  it('conserva las dos ediciones en partes distintas', () => {
    const [a, b] = fork('- uno\n- dos\n');
    applyTextEdit(a, '- cero\n- uno\n- dos\n');
    applyTextEdit(b, '- uno\n- dos\n- tres\n');
    exchange(a, b);
    expect(getContentText(a)).toBe('- cero\n- uno\n- dos\n- tres\n');
    expect(getContentText(b)).toBe(getContentText(a));
  });

  it('cambiar el primer y el último carácter no borra todo (bug de Desktop del 19 oct)', () => {
    const [a, b] = fork('abc');
    applyTextEdit(a, 'XbY');
    applyTextEdit(b, 'abZc');
    exchange(a, b);
    expect(getContentText(a)).toContain('Z');
    expect(getContentText(a)).toContain('X');
  });

  it('no falla con surrogates sueltos', () => {
    const doc = docWith('a\uD83D');
    expect(() => applyTextEdit(doc, 'b\uDE42')).not.toThrow();
    expect(getContentText(doc)).toBe('b\uDE42');
  });
});

describe('applyEditorEdit', () => {
  it('guarda solo el delta del usuario y no borra lo remoto que el editor no tenía', () => {
    const doc = docWith('- uno\n');
    const base = getContentText(doc); // lo que mostraba el editor al abrir
    applyTextEdit(doc, '- uno\n- remoto\n'); // llegó de otro cliente
    applyEditorEdit(doc, base, '- uno editado\n');
    expect(getContentText(doc)).toBe('- uno editado\n- remoto\n');
  });

  it('con applyTextEdit sobre el texto completo, lo remoto se perdía', () => {
    const doc = docWith('- uno\n');
    applyTextEdit(doc, '- uno\n- remoto\n');
    applyTextEdit(doc, '- uno editado\n');
    expect(getContentText(doc)).not.toContain('remoto');
  });

  it('sin cambios no toca el doc', () => {
    const doc = docWith('igual');
    const before = encodeDocStateB64(doc);
    applyEditorEdit(doc, 'igual', 'igual');
    expect(encodeDocStateB64(doc)).toBe(before);
  });
});

describe('rebaseText y la selección', () => {
  it('lleva al editor lo remoto sin perder lo escrito', () => {
    const r = rebaseText('a\nb\n', 'a\nb\nremoto\n', 'a escrito\nb\n');
    expect(r.text).toBe('a escrito\nb\nremoto\n');
  });

  it('mapTextIndex corre el cursor por lo insertado antes y no por lo insertado justo en él', () => {
    const r = rebaseText('mundo', 'hola mundo', 'mundo');
    expect(r.text).toBe('hola mundo');
    expect(mapTextIndex(r.changes, 5)).toBe(10);
    // Una inserción justo en la posición del cursor queda detrás de él.
    expect(mapTextIndex(r.changes, 0)).toBe(0);
  });

  it('mapTextIndex lleva al inicio una posición dentro de un tramo borrado', () => {
    const r = rebaseText('hola mundo', 'hola', 'hola mundo');
    expect(r.text).toBe('hola');
    expect(mapTextIndex(r.changes, 7)).toBe(4);
  });
});

describe('syncEditorText', () => {
  it('sin ediciones locales adopta lo que llega', () => {
    const state: EditorTextState = { base: 'a', text: 'a' };
    expect(syncEditorText(state, 'ab')?.text).toBe('ab');
    expect(state).toEqual({ base: 'ab', text: 'ab' });
  });

  it('con ediciones locales las rebasa sobre lo que llega', () => {
    const state: EditorTextState = { base: 'uno\n', text: 'uno\nmío\n' };
    expect(syncEditorText(state, 'cero\nuno\n')?.text).toBe('cero\nuno\nmío\n');
    expect(state.base).toBe('cero\nuno\n');
  });

  it('si llega lo mismo que ya era la base no hace nada', () => {
    const state: EditorTextState = { base: 'x', text: 'xy' };
    expect(syncEditorText(state, 'x')).toBeNull();
  });
});
