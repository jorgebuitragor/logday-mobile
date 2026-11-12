// Qué servidores de sync acepta la app y por qué esquema
// (specs/builds-nativos/). HTTP sin cifrar solo hacia la red local, porque
// muchas instalaciones propias no tienen certificado, y para una IP privada
// no se puede pedir uno público. Hacia un servidor público se exige HTTPS:
// el token de sync y el contenido viajarían en texto plano.
//
// La regla vive aquí y no en el sistema: Android solo sabe permitir HTTP
// para todo o para nada (`usesCleartextTraffic`, encendido en app.json),
// e iOS lo permite hacia la red local con `NSAllowsLocalNetworking`. Lo que
// se considera local aquí coincide con lo que iOS deja pasar con esa
// excepción, salvo que aquí además se rechazan las IPs públicas.

export type ServerUrlCheck =
  | { ok: true; url: string; encrypted: boolean }
  | { ok: false; reason: 'empty' | 'invalid' | 'insecure-public' };

/** El servidor es público y la URL pide `http://`. */
export class InsecureServerUrlError extends Error {
  constructor(url: string) {
    super(`HTTP sin cifrar solo se permite en la red local: ${url}`);
    this.name = 'InsecureServerUrlError';
  }
}

/** La URL no se puede interpretar como la de un servidor. */
export class InvalidServerUrlError extends Error {
  constructor(url: string) {
    super(`URL de servidor no válida: ${url}`);
    this.name = 'InvalidServerUrlError';
  }
}

function parseIPv4(host: string): number[] | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  const parts = host.split('.').map(Number);
  return parts.every((n) => n <= 255) ? parts : null;
}

/** Host de la red local: `localhost`, IPs privadas, de enlace local o de
 *  CGNAT (100.64.0.0/10, la de Tailscale), nombres `.local` y nombres sin
 *  dominio (`nas`). Recibe el host sin corchetes ni puerto. */
export function isLocalHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;

  const ip4 = parseIPv4(host);
  if (ip4) {
    const [a, b] = ip4;
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }

  if (host.includes(':')) {
    // IPv6: loopback, ULA (fc00::/7) y enlace local (fe80::/10).
    return host === '::1' || /^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host);
  }

  // Sin punto: un nombre de la red local que no es una IP.
  return !host.includes('.') && !/^\d+$/.test(host);
}

interface ParsedUrl {
  scheme: string | null;
  host: string;
  rest: string;
}

// A mano y no con `URL`: en React Native `URL#hostname` no está implementado.
function parse(input: string): ParsedUrl | null {
  const m = /^(?:([a-z][a-z0-9+.-]*):\/\/)?([^/?#]*)(.*)$/i.exec(input);
  if (!m) return null;
  const authority = m[2].slice(m[2].lastIndexOf('@') + 1);
  const hostMatch = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(authority);
  if (!hostMatch) return null;
  const host = hostMatch[1].replace(/^\[|\]$/g, '');
  return { scheme: m[1] ? m[1].toLowerCase() : null, host, rest: m[3] };
}

/** Revisa la URL que escribió el usuario. Sin esquema se asume `http://`
 *  hacia la red local (escribir "192.168.1.10:8080" es lo natural) y
 *  `https://` hacia lo demás. */
export function checkServerUrl(input: string): ServerUrlCheck {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) return { ok: false, reason: 'empty' };
  const parsed = parse(trimmed);
  if (!parsed || !parsed.host || /\s/.test(trimmed)) return { ok: false, reason: 'invalid' };
  if (parsed.scheme && parsed.scheme !== 'http' && parsed.scheme !== 'https') return { ok: false, reason: 'invalid' };

  const local = isLocalHost(parsed.host);
  const scheme = parsed.scheme ?? (local ? 'http' : 'https');
  if (scheme === 'http' && !local) return { ok: false, reason: 'insecure-public' };

  const url = parsed.scheme ? trimmed : `${scheme}://${trimmed}`;
  return { ok: true, url, encrypted: scheme === 'https' };
}

/** La URL lista para usar, o un error si la app no debe conectarse ahí.
 *  Todo pedido al servidor pasa por aquí (syncApi.ts, realtime.ts). */
export function resolveServerUrl(input: string): string {
  const check = checkServerUrl(input);
  if (check.ok) return check.url;
  if (check.reason === 'insecure-public') throw new InsecureServerUrlError(input.trim());
  throw new InvalidServerUrlError(input.trim());
}
