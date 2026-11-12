import { describe, expect, it } from '@jest/globals';

import { isAllowedLink, linkScheme } from './noteLinks';

describe('isAllowedLink', () => {
  it.each(['https://logday.app', 'http://192.168.1.10:8080/x', 'HTTPS://EJEMPLO.COM', 'mailto:ana@ejemplo.com'])('abre %s', (url) => {
    expect(isAllowedLink(url)).toBe(true);
  });

  it.each([
    'intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end',
    'tel:+573001234567',
    'sms:+573001234567',
    'otraapp://pagar?monto=100',
    'javascript:alert(1)',
    'file:///data/data/dev.logday.app/databases/logday.db',
    'content://com.android.contacts/contacts',
    '/ruta/relativa',
    'ejemplo.com',
    '',
  ])('no abre %s', (url) => {
    expect(isAllowedLink(url)).toBe(false);
  });
});

describe('linkScheme', () => {
  it('ignora los espacios del principio y pasa a minúsculas', () => {
    expect(linkScheme('  HTTPS://x')).toBe('https');
    expect(linkScheme('sin-esquema')).toBeNull();
  });
});
