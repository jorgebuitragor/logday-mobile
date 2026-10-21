// Serializa operaciones async sobre la misma entidad. Guardar una edición
// local y aplicar un cambio remoto son leer → mezclar → escribir sobre la
// misma fila (y el mismo `Y.Doc`); si dos se pisan en el medio, la que
// escribe última borra lo que mezcló la otra. Antes daba igual porque el
// guardado mandaba el texto completo; ahora que solo se aplica el delta del
// usuario (`crdtText.applyEditorEdit`), una carrera perdería ese delta.

const tails = new Map<string, Promise<unknown>>();

/** Corre `fn` después de que terminen las operaciones anteriores con la
 *  misma `key`, aunque hayan fallado. No reentrante: `fn` no puede volver a
 *  pedir la misma `key` o se queda esperando para siempre. */
export function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  tails.set(key, tail);
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return run;
}
