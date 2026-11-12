import AsyncStorage from '@react-native-async-storage/async-storage';

import { uploadLocalAbsenceDay } from '../db/absences';
import { seedMissingDailyContentStates, uploadLocalDailyEntry } from '../db/dailyEntries';
import { getDb } from '../db/index';
import { seedMissingNoteContentStates, uploadLocalNote } from '../db/notes';
import { uploadLocalOvertimeEntry, uploadLocalOvertimeMonthMeta } from '../db/overtime';
import { uploadLocalTask } from '../db/tasks';
import { hasInsertsMissingFrom, stateVectorFromStateB64 } from './crdtText';
import type { SyncChange, SyncEntityType } from './syncApi';

// Subida inicial — Fase 4 del sync (specs/sync-mobile/). Mientras el sync
// está apagado (antes de conectar, o tras cerrar sesión), lo que se crea o
// edita en el teléfono se guarda solo en SQLite: nada se encola. Al
// iniciar sesión, este paso sube lo que el servidor no tiene.
//
// Regla central, la misma que la migración de Desktop
// (`task-manager/src/lib/syncMigration.ts`): solo se sube lo que el
// servidor no tiene por su clave (id, `year_month` o fecha). Nunca se
// inventa un `updated_at` para ganar un conflicto ni se pisa lo que ya
// existe allá. Diferencias con Desktop, porque aquí es automático:
//
// - Las claves del servidor salen del mismo pull desde 0 que trae sus
//   datos (`/sync/changes`, que incluye los borrados), no de los listados
//   por entidad: una sola descarga, y una entidad borrada en el servidor
//   no se resucita.
// - El contenido de notas y dailys es CRDT, así que una nota o un día que
//   ya existe en los dos lados se mezcla en vez de saltarse: el pull une
//   el estado del servidor con el local y aquí se manda lo que el
//   teléfono tenía y el servidor no (`hasInsertsMissingFrom`). Así no se
//   pierde el texto de ninguno de los dos.
//
// Es idempotente: si se corta a medias, el flag queda puesto y se repite
// entera en el próximo pull. Lo ya subido aparece como "ya existía".

const PENDING_KEY = 'syncInitialUploadPending';

/** Marca que hay que correr la subida inicial en el próximo pull. Lo
 *  llama `syncConnect` al iniciar sesión. */
export async function requestInitialUpload(): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, '1');
}

export async function isInitialUploadPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(PENDING_KEY)) === '1';
}

/** Lo que el servidor tiene, armado durante el pull desde 0. */
export interface ServerSnapshot {
  /** Claves `tipo:clave`, vivas o borradas. */
  keys: Set<string>;
  /** Las que están borradas en el servidor (su último cambio es un borrado). */
  deleted: Set<string>;
  /** Vector de estado del contenido de cada nota y daily vivo. */
  contentVectors: Map<string, Uint8Array>;
}

const key = (type: SyncEntityType, id: string) => `${type}:${id}`;

/** Lo que el teléfono tenía antes del pull: claves vivas y, para notas y
 *  dailys, su estado CRDT. Se toma antes porque el pull mezcla el estado
 *  del servidor con el local y después ya no se distingue qué era local. */
interface LocalSnapshot {
  keys: { type: SyncEntityType; id: string }[];
  contentStates: Map<string, string>;
}

async function takeLocalSnapshot(): Promise<LocalSnapshot> {
  const db = getDb();
  const ids = async (sql: string) => (await db.getAllAsync<{ k: string }>(sql)).map((r) => r.k);
  const keys: LocalSnapshot['keys'] = [];
  const push = (type: SyncEntityType, list: string[]) => list.forEach((id) => keys.push({ type, id }));
  push('task', await ids('SELECT id AS k FROM tasks WHERE deleted_at IS NULL'));
  push('overtime_entry', await ids('SELECT id AS k FROM overtime_entries WHERE deleted_at IS NULL'));
  push('overtime_month_meta', await ids("SELECT year_month AS k FROM overtime_month_meta WHERE deleted_at IS NULL AND (colaborador != '' OR cedula != '')"));
  push('absence_day', await ids('SELECT id AS k FROM absence_days WHERE deleted_at IS NULL'));
  push('note', await ids('SELECT id AS k FROM notes WHERE deleted_at IS NULL'));
  push('daily_entry', await ids("SELECT date AS k FROM daily_entries WHERE deleted_at IS NULL AND content != ''"));

  const contentStates = new Map<string, string>();
  for (const r of await db.getAllAsync<{ k: string; s: string }>('SELECT id AS k, content_state AS s FROM notes WHERE deleted_at IS NULL AND content_state IS NOT NULL')) {
    contentStates.set(key('note', r.k), r.s);
  }
  for (const r of await db.getAllAsync<{ k: string; s: string }>('SELECT date AS k, content_state AS s FROM daily_entries WHERE deleted_at IS NULL AND content_state IS NOT NULL')) {
    contentStates.set(key('daily_entry', r.k), r.s);
  }
  return { keys, contentStates };
}

/** Anota cada cambio del pull en el snapshot del servidor. */
export function recordServerChanges(snapshot: ServerSnapshot, changes: SyncChange[]): void {
  for (const c of changes) {
    const k = key(c.type, c.id);
    snapshot.keys.add(k);
    if (c.deleted) snapshot.deleted.add(k);
    else snapshot.deleted.delete(k);
    const state = (c.data as { content_state?: string } | null)?.content_state;
    if (!c.deleted && state && (c.type === 'note' || c.type === 'daily_entry')) {
      snapshot.contentVectors.set(k, stateVectorFromStateB64(state));
    } else {
      snapshot.contentVectors.delete(k);
    }
  }
}

/** Corre la subida inicial. `pullAllFromZero` trae y aplica todo el
 *  historial del servidor (como un full resync) y le pasa cada página a
 *  `onPage`. Si algo falla, lanza y el flag queda puesto. */
export async function runInitialUpload(
  pullAllFromZero: (onPage: (changes: SyncChange[]) => void) => Promise<void>
): Promise<{ uploaded: number }> {
  await seedMissingNoteContentStates();
  await seedMissingDailyContentStates();
  const local = await takeLocalSnapshot();

  const server: ServerSnapshot = { keys: new Set(), deleted: new Set(), contentVectors: new Map() };
  await pullAllFromZero((changes) => recordServerChanges(server, changes));

  let uploaded = 0;
  for (const { type, id } of local.keys) {
    const k = key(type, id);
    const onServer = server.keys.has(k);
    // Borrada en el servidor: el pull ya la borró aquí y no se resucita.
    // Tampoco se sube lo que el servidor ya tiene vivo, salvo el texto
    // de notas y dailys que le falte.
    if (server.deleted.has(k)) continue;
    if (type === 'note' || type === 'daily_entry') {
      const localState = local.contentStates.get(k);
      const pushContent = !!localState && hasInsertsMissingFrom(localState, server.contentVectors.get(k) ?? null);
      if (type === 'note') {
        if (onServer && !pushContent) continue;
        await uploadLocalNote(id, { create: !onServer, pushContent });
      } else {
        if (!pushContent) continue;
        await uploadLocalDailyEntry(id);
      }
      uploaded += 1;
      continue;
    }
    if (onServer) continue;
    if (type === 'task') await uploadLocalTask(id);
    else if (type === 'overtime_entry') await uploadLocalOvertimeEntry(id);
    else if (type === 'overtime_month_meta') await uploadLocalOvertimeMonthMeta(id);
    else if (type === 'absence_day') await uploadLocalAbsenceDay(id);
    uploaded += 1;
  }
  await AsyncStorage.removeItem(PENDING_KEY);
  return { uploaded };
}
