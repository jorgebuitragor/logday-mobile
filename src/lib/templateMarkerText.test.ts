import { describe, expect, it } from '@jest/globals';
import { fromDisplay, strayLabels, toDisplay, toDisplaySegments } from './templateMarkerText';

const labels = {
  'hoy.dia': 'Fecha del Daily (dice «de hoy» si es hoy)',
  'hoy.fecha': 'Fecha del Daily',
  'usuario.nombre': 'Tu nombre',
};

describe('marcadores como recuadros', () => {
  it('ida y vuelta, también con «» dentro de un nombre', () => {
    const template = 'El día {{hoy.dia}}:\n{{hoy.fecha}} de {{usuario.nombre}} {{otro}} {{#hoy.es_hoy}}x{{/hoy.es_hoy}}';
    const display = toDisplay(template, labels);
    expect(display).toBe('El día «Fecha del Daily (dice «de hoy» si es hoy)»:\n«Fecha del Daily» de «Tu nombre» {{otro}} {{#hoy.es_hoy}}x{{/hoy.es_hoy}}');
    expect(fromDisplay(display, labels)).toBe(template);
  });

  it('los tramos marcan solo los marcadores conocidos', () => {
    expect(toDisplaySegments('A {{usuario.nombre}} {{otro}}', labels)).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'marker', name: 'usuario.nombre', text: '«Tu nombre»' },
      { kind: 'text', text: ' ' },
      { kind: 'text', text: '{{otro}}' },
    ]);
  });

  it('un recuadro editado por dentro queda como texto y se avisa', () => {
    const template = fromDisplay('Hola «Tu nombr» y «Tu nombre»', labels);
    expect(template).toBe('Hola «Tu nombr» y {{usuario.nombre}}');
    expect(strayLabels(template)).toEqual(['«Tu nombr»']);
  });
});
