import { describe, expect, it } from '@jest/globals';
import appJson from '../../app.json';
import { checkServerUrl, InsecureServerUrlError, InvalidServerUrlError, isLocalHost, resolveServerUrl } from './serverUrl';

describe('isLocalHost', () => {
  it.each([
    'localhost',
    'app.localhost',
    '127.0.0.1',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.10',
    '169.254.10.20',
    '100.64.0.1',
    '100.127.255.254',
    'nas.local',
    'NAS.LOCAL.',
    'nas',
    '::1',
    'fd12:3456::1',
    'fe80::1',
  ])('%s es local', (host) => {
    expect(isLocalHost(host)).toBe(true);
  });

  it.each([
    'logday.example.com',
    '8.8.8.8',
    '172.15.0.1',
    '172.32.0.1',
    '192.169.0.1',
    '100.63.255.255',
    '100.128.0.1',
    '256.168.1.1',
    '2001:db8::1',
    'local.example.com',
    '',
  ])('%s no es local', (host) => {
    expect(isLocalHost(host)).toBe(false);
  });
});

describe('checkServerUrl', () => {
  it('sin esquema, asume http:// en la red local', () => {
    expect(checkServerUrl('192.168.1.10:8080')).toEqual({ ok: true, url: 'http://192.168.1.10:8080', encrypted: false });
    expect(checkServerUrl(' nas.local/ ')).toEqual({ ok: true, url: 'http://nas.local', encrypted: false });
  });

  it('sin esquema, asume https:// hacia un servidor público', () => {
    expect(checkServerUrl('logday.example.com')).toEqual({ ok: true, url: 'https://logday.example.com', encrypted: true });
  });

  it('acepta http:// en la red local, también con IPv6 entre corchetes', () => {
    expect(checkServerUrl('http://10.0.0.2:8080')).toEqual({ ok: true, url: 'http://10.0.0.2:8080', encrypted: false });
    expect(checkServerUrl('http://[fd00::2]:8080')).toEqual({ ok: true, url: 'http://[fd00::2]:8080', encrypted: false });
  });

  it('acepta https:// hacia cualquier servidor y quita la barra final', () => {
    expect(checkServerUrl('HTTPS://logday.example.com/')).toEqual({ ok: true, url: 'HTTPS://logday.example.com', encrypted: true });
    expect(checkServerUrl('https://192.168.1.10:8443')).toEqual({ ok: true, url: 'https://192.168.1.10:8443', encrypted: true });
  });

  it('rechaza http:// hacia un servidor público', () => {
    expect(checkServerUrl('http://logday.example.com')).toEqual({ ok: false, reason: 'insecure-public' });
    expect(checkServerUrl('http://8.8.8.8:8080')).toEqual({ ok: false, reason: 'insecure-public' });
  });

  it('mira el host y no los datos de usuario de la URL', () => {
    expect(checkServerUrl('http://192.168.1.10@logday.example.com')).toEqual({ ok: false, reason: 'insecure-public' });
  });

  it('distingue una URL vacía de una inválida', () => {
    expect(checkServerUrl('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkServerUrl('ftp://192.168.1.10')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkServerUrl('http://')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkServerUrl('mi servidor')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkServerUrl('http://host:puerto')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('resolveServerUrl', () => {
  it('devuelve la URL lista para usar', () => {
    expect(resolveServerUrl('192.168.1.10:8080')).toBe('http://192.168.1.10:8080');
  });

  it('lanza un error distinto para http:// público y para una URL inválida', () => {
    expect(() => resolveServerUrl('http://logday.example.com')).toThrow(InsecureServerUrlError);
    expect(() => resolveServerUrl('ftp://x')).toThrow(InvalidServerUrlError);
  });
});

// La regla de la app solo sirve si el sistema deja pasar HTTP hacia la red
// local: Android lo bloquea por omisión en los builds de release, e iOS
// también salvo con la excepción de red local.
describe('configuración nativa', () => {
  const plugins = appJson.expo.plugins as unknown[];

  it('Android permite HTTP (la app lo limita a la red local)', () => {
    const entry = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties') as
      | [string, { android?: { usesCleartextTraffic?: boolean } }]
      | undefined;
    expect(entry?.[1].android?.usesCleartextTraffic).toBe(true);
  });

  it('iOS permite solo la red local, sin abrir HTTP en general', () => {
    expect(appJson.expo.ios.infoPlist.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true,
    });
  });
});
