import { beforeAll, describe, expect, it } from '@jest/globals';

import { getDb, initDb } from './index';
import { EMPTY_FILTERS, searchAll } from './search';

// Sobre SQLite real (`node:sqlite`, ver src/__mocks__/expo-sqlite.ts) y
// con TZ=America/Bogota (jest.config.js).

beforeAll(async () => {
  await initDb();
  // Editada el 28 oct a las 8:30 p. m. en Colombia: en UTC ya es el 29.
  await getDb().runAsync(
    `INSERT INTO notes (id, title, folder, tags, created, updated, pinned, content, updated_at)
     VALUES ('n1', 'reunión de sync', '', '[]', '2026-10-01', '2026-10-29T01:30:00.000Z', 0, '', '2026-10-29T01:30:00.000Z')`
  );
  // Nota de Desktop con `updated` legado (YYYY-MM-DD).
  await getDb().runAsync(
    `INSERT INTO notes (id, title, folder, tags, created, updated, pinned, content, updated_at)
     VALUES ('n2', 'reunión vieja', '', '[]', '2026-10-01', '2026-10-27', 0, '', '2026-10-27')`
  );
});

async function noteIds(dateFrom: string | null, dateTo: string | null): Promise<string[]> {
  const r = await searchAll('reunión', { ...EMPTY_FILTERS, dateFrom, dateTo });
  return r.note.map((n) => n.id).sort();
}

describe('filtro Desde/Hasta de la búsqueda', () => {
  it('una nota editada de noche entra en el "Hasta" de su día local', async () => {
    expect(await noteIds(null, '2026-10-28')).toEqual(['n1', 'n2']);
    expect(await noteIds('2026-10-28', '2026-10-28')).toEqual(['n1']);
  });

  it('y no entra en el día siguiente', async () => {
    expect(await noteIds('2026-10-29', null)).toEqual([]);
  });

  it('los `updated` legados también filtran por su día', async () => {
    expect(await noteIds('2026-10-27', '2026-10-27')).toEqual(['n2']);
  });
});
