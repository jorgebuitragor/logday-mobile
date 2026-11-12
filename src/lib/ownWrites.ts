// Los `seq` que el servidor devolvió a las escrituras de este teléfono.
// El servidor avisa por `/ws` a todas las conexiones del usuario,
// incluida la que hizo el cambio, así que cada escritura propia vuelve
// como un aviso: un eco. Si el `seq` del aviso es uno de estos, el
// teléfono ya tiene ese cambio y no hace falta pedir `/sync/changes`.
//
// No se avanza el cursor con estos `seq`, como hace Web: el `seq` es
// global por usuario, así que saltar el cursor al de una escritura
// propia se salta los cambios de otros clientes que haya en medio y
// que el teléfono todavía no trajo.
//
// Los borrados no entran: el servidor responde 204 sin cuerpo, así que
// su eco sigue disparando un pull.

const MAX_SEQS = 200;

const seqs = new Set<number>();

export function recordOwnWriteSeq(seq: number): void {
  seqs.add(seq);
  if (seqs.size > MAX_SEQS) {
    // Un Set recorre en orden de inserción: el primero es el más viejo.
    const oldest = seqs.values().next().value;
    if (oldest !== undefined) seqs.delete(oldest);
  }
}

export function isOwnWriteSeq(seq: number): boolean {
  return seqs.has(seq);
}

/** Al abrir el tiempo real se empieza de cero: los `seq` son por usuario
 *  y la sesión pudo cambiar de cuenta. Perder alguno solo cuesta un pull. */
export function clearOwnWriteSeqs(): void {
  seqs.clear();
}
