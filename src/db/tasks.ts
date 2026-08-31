import { randomUUID } from 'expo-crypto';

import { diffChangedFields } from '../lib/objectDiff';
import { createTaskRemote, deleteTaskRemote, patchTaskRemote, SyncApiError, type SyncChange } from '../lib/syncApi';
import { taskFieldsToPatchPayload, taskFromApiResponse, taskToCreatePayload, TASK_FIELD_MAP, type TaskApiResponse } from '../lib/syncMapping';
import * as syncQueue from '../lib/syncQueue';
import { getSyncRuntime } from '../lib/syncRuntime';
import type { Task, TaskStatus } from '../types/task';
import { getDb } from './index';

interface TaskRow {
  id: string;
  title: string;
  task_code: string | null;
  status: TaskStatus;
  tags: string;
  project: string;
  created: string;
  completed_at: string | null;
  due: string | null;
  content: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    taskCode: row.task_code,
    status: row.status,
    tags: JSON.parse(row.tags) as string[],
    project: row.project,
    created: row.created,
    completedAt: row.completed_at,
    due: row.due,
    content: row.content,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const rows = await getDb().getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created DESC'
  );
  return rows.map(rowToTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const row = await getDb().getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? rowToTask(row) : null;
}

export interface TaskInput {
  title: string;
  taskCode: string | null;
  status: TaskStatus;
  tags: string[];
  project: string;
  due: string | null;
  content: string;
}

export async function createTask(input: TaskInput): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  // Igual que TaskEditor.tsx de desktop: al crear ya en 'done' se sella
  // completed_at de inmediato (caso raro pero posible).
  const completedAt = input.status === 'done' ? now : null;
  await getDb().runAsync(
    `INSERT INTO tasks (id, title, task_code, status, tags, project, created, completed_at, due, content, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    id,
    input.title,
    input.taskCode,
    input.status,
    JSON.stringify(input.tags),
    input.project,
    now,
    completedAt,
    input.due,
    input.content,
    now
  );
  void syncCreateTask({
    id, title: input.title, taskCode: input.taskCode, status: input.status, tags: input.tags,
    project: input.project, created: now, completedAt, due: input.due, content: input.content,
    updatedAt: now, deletedAt: null,
  });
  return id;
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const now = new Date().toISOString();
  const current = await getTask(id);
  // Mismo criterio que appStore.updateTask en desktop: sella completed_at
  // en la primera transición a 'done' (conserva la fecha si ya estaba
  // sellada) y la limpia si la task vuelve a un estado no-done.
  const completedAt = input.status === 'done' ? (current?.completedAt ?? now) : null;
  await getDb().runAsync(
    `UPDATE tasks SET title = ?, task_code = ?, status = ?, tags = ?, project = ?, due = ?, content = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    input.title,
    input.taskCode,
    input.status,
    JSON.stringify(input.tags),
    input.project,
    input.due,
    input.content,
    completedAt,
    now,
    id
  );
  const next: Task = { id, ...input, completedAt, created: current?.created ?? now, updatedAt: now, deletedAt: null };
  const changed = diffChangedFields(current, next, ['title', 'taskCode', 'status', 'tags', 'project', 'due', 'content', 'completedAt']);
  void syncPatchTask(id, changed);
}

/** Cambio rápido de estado desde el listado (ciclo todo -> in-progress ->
 * done -> todo), sin pasar por el formulario completo. Ver `TaskRow` en
 * `TaskList.tsx` de desktop (ícono de estado clickeable en cada fila). */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const now = new Date().toISOString();
  const current = await getDb().getFirstAsync<{ completed_at: string | null }>(
    'SELECT completed_at FROM tasks WHERE id = ?',
    id
  );
  const completedAt = status === 'done' ? (current?.completed_at ?? now) : null;
  await getDb().runAsync(
    'UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    status,
    completedAt,
    now,
    id
  );
  void syncPatchTask(id, { status, completedAt });
}

export async function softDeleteTask(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE tasks SET deleted_at = ? WHERE id = ?', now, id);
  void syncDeleteTask(id);
}

// ── Sync (logday-server) ──────────────────────────────────────────
// Puerto del patrón syncCreateTask/syncPatchTask/syncDeleteTask de
// `appStore.ts` en desktop: intenta mandar la escritura ya si hay
// conexión, encola si no (o si falla). Vive acá (no en syncEngine.ts)
// para evitar un ciclo de import: syncEngine necesita
// `upsertTaskFromRemote`/`applyRemoteTaskChange` de este archivo para
// aplicar el pull, y este archivo necesita las funciones de push de
// abajo — separarlas en dos módulos distintos rompería la dirección
// única de dependencia. Ver specs/sync-mobile/design.md.

async function syncCreateTask(task: Task): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  const payload = taskToCreatePayload(task);
  if (!runtime.connected) {
    await syncQueue.enqueue('task', task.id, 'create', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => createTaskRemote(runtime.serverUrl, token, payload));
    await applyTaskResponse(task.id, new Date().toISOString(), response);
  } catch {
    await syncQueue.enqueue('task', task.id, 'create', payload as unknown as Record<string, unknown>);
  }
}

async function syncPatchTask(id: string, fields: Partial<Task>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || Object.keys(fields).length === 0) return;
  const payload = taskFieldsToPatchPayload(fields);
  const queuedAt = new Date().toISOString();
  if (!runtime.connected) {
    await syncQueue.enqueue('task', id, 'patch', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => patchTaskRemote(runtime.serverUrl, token, id, payload));
    await applyTaskResponse(id, queuedAt, response);
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return; // se borró en el servidor mientras tanto
    await syncQueue.enqueue('task', id, 'patch', payload as unknown as Record<string, unknown>);
  }
}

async function syncDeleteTask(id: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await syncQueue.enqueue('task', id, 'delete');
    return;
  }
  try {
    await runtime.withSyncAuth((token) => deleteTaskRemote(runtime.serverUrl, token, id));
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('task', id, 'delete');
  }
}

/** Aplica la respuesta de un create/patch a la fila local, campo por
 * campo, salteando cualquier campo que ya tenga una entrada más
 * nueva en cola ("regla de prioridad cola vs. respuesta tardía",
 * mismo criterio que `applyTaskResponse` en `appStore.ts` de
 * desktop) — esa entrada, cuando se drene, va a traer el valor final
 * real; pisarlo ahora con una respuesta vieja perdería la edición
 * todavía no enviada. Escribe directo por SQL, no via `updateTask`
 * (evita volver a disparar un push de vuelta). */
async function applyTaskResponse(id: string, sinceIso: string, response: TaskApiResponse): Promise<void> {
  const current = await getTask(id);
  if (!current) return; // se borró localmente mientras tanto
  const mapped = taskFromApiResponse(response);
  const merged = { ...current } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(TASK_FIELD_MAP)) {
    if (!(await syncQueue.hasNewerQueuedField('task', id, serverKey, sinceIso))) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await writeTaskRow(merged as unknown as Task, response.updated_at);
}

async function writeTaskRow(task: Task, updatedAt: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO tasks (id, title, task_code, status, tags, project, created, completed_at, due, content, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, task_code = excluded.task_code, status = excluded.status, tags = excluded.tags,
       project = excluded.project, created = excluded.created, completed_at = excluded.completed_at,
       due = excluded.due, content = excluded.content, updated_at = excluded.updated_at, deleted_at = NULL`,
    task.id,
    task.title,
    task.taskCode,
    task.status,
    JSON.stringify(task.tags),
    task.project,
    task.created,
    task.completedAt,
    task.due,
    task.content,
    updatedAt
  );
}

/** Aplica un cambio recibido de `/sync/changes` (pull) — mismo
 * criterio de "cola gana" que `applyTaskResponse`, pero usando EPOCH
 * en vez de un `sinceIso` puntual: cualquier entrada en cola ahora
 * mismo es, por definición, una edición local todavía sin confirmar,
 * sin importar cuándo se encoló (mismo criterio que
 * `applyRemoteTaskChange` en `appStore.ts` de desktop). */
const EPOCH = '0000-01-01T00:00:00.000Z';

export async function applyRemoteTaskChange(change: SyncChange): Promise<void> {
  if (change.deleted) {
    await getDb().runAsync('UPDATE tasks SET deleted_at = ? WHERE id = ?', change.updated_at, change.id);
    return;
  }
  const current = await getTask(change.id);
  const mapped = taskFromApiResponse(change.data as TaskApiResponse);
  const merged = { ...current, ...mapped } as Record<string, unknown>;
  if (current) {
    for (const [localKey, serverKey] of Object.entries(TASK_FIELD_MAP)) {
      if (await syncQueue.hasNewerQueuedField('task', change.id, serverKey, EPOCH)) {
        merged[localKey] = (current as unknown as Record<string, unknown>)[localKey];
      }
    }
  }
  await writeTaskRow(merged as unknown as Task, change.updated_at);
}
