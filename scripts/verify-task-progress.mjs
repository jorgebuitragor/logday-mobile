// Verificación del campo `progress` de las tareas (specs/progreso-tasks/)
// sin dispositivo ni servidor: validación local y mapeo local <-> payload
// REST de logday-server. El repo no tiene framework de pruebas; esto se
// corre a mano:
//
//   node scripts/verify-task-progress.mjs
//
// Necesita Node 22.18+ o 24 (quita los tipos de TypeScript al importar).
// El hook solo agrega la extensión `.ts` a los imports relativos, que en
// `src/` se escriben sin extensión porque los resuelve Metro.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const progress = await import('../src/lib/taskProgress.ts');
const mapping = await import('../src/lib/syncMapping.ts');
const { diffChangedFields } = await import('../src/lib/objectDiff.ts');

let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`ok - ${name}`);
}

const baseTask = {
  id: 't1', title: 'Tarea', taskCode: null, status: 'todo', tags: [], project: '', created: '2026-10-29T12:00:00.000Z',
  completedAt: null, due: null, progress: null, content: '', updatedAt: '2026-10-29T12:00:00.000Z', deletedAt: null,
};
const serverTask = {
  id: 't1', title: 'Tarea', status: 'todo', tags: [], project: '', created: '2026-10-29T12:00:00.000Z',
  content: '', seq: 1, updated_at: '2026-10-29T12:00:00.000Z',
};

check('isValidProgress acepta null y enteros 0–100', () => {
  for (const v of [null, 0, 1, 50, 100]) assert.equal(progress.isValidProgress(v), true, String(v));
  for (const v of [undefined, -1, 101, 40.5, Number.NaN, '40', true]) assert.equal(progress.isValidProgress(v), false, String(v));
});

check('parseProgressText: vacío = null, solo dígitos 0–100', () => {
  assert.deepEqual(progress.parseProgressText(''), { ok: true, value: null });
  assert.deepEqual(progress.parseProgressText('  '), { ok: true, value: null });
  assert.deepEqual(progress.parseProgressText('0'), { ok: true, value: 0 });
  assert.deepEqual(progress.parseProgressText(' 40 '), { ok: true, value: 40 });
  assert.deepEqual(progress.parseProgressText('100'), { ok: true, value: 100 });
  for (const t of ['101', '-1', '40.5', '1e2', '4 0', 'abc', '40%']) assert.deepEqual(progress.parseProgressText(t), { ok: false }, t);
});

check('respuesta sin la clave progress (servidor anterior) -> null', () => {
  assert.equal(mapping.taskFromApiResponse(serverTask).progress, null);
});

check('respuesta con null explícito -> null; con 0 -> 0 (null no es 0)', () => {
  assert.equal(mapping.taskFromApiResponse({ ...serverTask, progress: null }).progress, null);
  assert.equal(mapping.taskFromApiResponse({ ...serverTask, progress: 0 }).progress, 0);
  assert.equal(mapping.taskFromApiResponse({ ...serverTask, progress: 75 }).progress, 75);
});

check('respuesta con valor inválido no se guarda (-> null)', () => {
  assert.equal(mapping.taskFromApiResponse({ ...serverTask, progress: 140 }).progress, null);
  assert.equal(mapping.taskFromApiResponse({ ...serverTask, progress: '40' }).progress, null);
});

check('create siempre manda la clave progress', () => {
  const sinProgreso = mapping.taskToCreatePayload(baseTask);
  assert.ok('progress' in sinProgreso);
  assert.equal(sinProgreso.progress, null);
  assert.equal(mapping.taskToCreatePayload({ ...baseTask, progress: 30 }).progress, 30);
});

check('PATCH: ausente si no cambió, valor si cambió, null para borrar', () => {
  const keys = ['title', 'progress'];
  const sinCambio = mapping.taskFieldsToPatchPayload(diffChangedFields({ title: 'a', progress: 40 }, { title: 'b', progress: 40 }, keys));
  assert.equal('progress' in sinCambio, false);
  assert.equal(sinCambio.title, 'b');
  const cambia = mapping.taskFieldsToPatchPayload(diffChangedFields({ title: 'a', progress: 40 }, { title: 'a', progress: 60 }, keys));
  assert.deepEqual(Object.keys(cambia).sort(), ['progress', 'updated_at']);
  assert.equal(cambia.progress, 60);
  const borra = mapping.taskFieldsToPatchPayload(diffChangedFields({ title: 'a', progress: 40 }, { title: 'a', progress: null }, keys));
  assert.ok('progress' in borra);
  assert.equal(borra.progress, null);
  const deCeroANull = diffChangedFields({ progress: 0 }, { progress: null }, ['progress']);
  assert.ok('progress' in deCeroANull, '0 -> null es un cambio');
});

check('TASK_FIELD_MAP incluye progress (guard "cola gana")', () => {
  assert.equal(mapping.TASK_FIELD_MAP.progress, 'progress');
});

console.log(`\n${checks} verificaciones correctas`);
