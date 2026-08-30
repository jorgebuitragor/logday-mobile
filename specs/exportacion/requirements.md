# Exportación — Requirements

Estado: Notes, Dailys y Overtime implementados, pendiente de
confirmación en vivo.

## Contexto

Desktop (Tauri) exporta con un diálogo nativo de guardado (`@tauri-apps/plugin-dialog`)
+ escritura a disco vía comandos Rust (`fs.writeFile`/`writeBinary`).
Mobile no tiene ese modelo — no hay "elegir una ruta arbitraria del
sistema de archivos y escribir ahí" sin un document picker. Se usa en
su lugar el patrón estándar de exportación en apps móviles: escribir
un archivo temporal y abrir la hoja de compartir del sistema
(`expo-sharing`), dejando que el usuario decida destino (guardar en
Drive, enviar por otra app, etc.).

Por entidad, los formatos que ofrece desktop (investigado a fondo
antes de implementar, ver el spec de cada pantalla):

| Entidad | Formatos en desktop | Alcance | Estado en mobile |
|---|---|---|---|
| Notes | Markdown, Texto plano, PDF | Por nota | **Implementado** |
| Dailys | Markdown, Texto plano, PDF | Por mes | **Implementado** |
| Overtime | Excel (.xlsx) | Por mes | **Implementado** |
| Tasks | (ninguno) | — | N/A — desktop tampoco lo tiene |

## Requisitos (EARS) — Notes

- El sistema DEBERÁ ofrecer exportar una nota en 3 formatos: Markdown
  (`.md`), texto plano (`.txt`), PDF (`.pdf`) — mismos 3 formatos que
  desktop.
- Markdown DEBERÁ usar el mismo formato que "Copiar"
  (`"# título\n\ncontenido"`, o solo el contenido sin título) —
  `buildMarkdownDoc` en `src/lib/noteExport.ts`.
- Texto plano DEBERÁ usar el mismo criterio sin los símbolos `#` de
  markdown (`"título\n\ncontenido"`).
- PDF DEBERÁ renderizar el markdown con formato real (títulos,
  negrita, cursiva, código, listas, citas), no como texto crudo con
  símbolos visibles.
- Exportar CUALQUIER formato DEBERÁ terminar en la hoja de compartir
  nativa del sistema (`expo-sharing`), no en un diálogo de "guardar
  en ruta" (no existe ese concepto en mobile sin un document picker
  adicional).
- El nombre de archivo sugerido DEBERÁ derivarse del título de la nota
  (saneado: sin caracteres inválidos de nombre de archivo), con un
  nombre por defecto si la nota no tiene título.

## Requisitos (EARS) — Dailys (agregado 2026-08-29)

- El sistema DEBERÁ ofrecer, por mes, exportar todas las entradas de
  ese mes en Markdown (`.md`), texto plano (`.txt`) o PDF (`.pdf`) —
  mismos 3 formatos y mismo contenido (encabezado + días separados
  por `---`) que `dailyMonthExport.ts` de desktop.
- Las entradas DEBERÁN ordenarse cronológicamente ascendente en el
  documento exportado (el listado en pantalla es descendente).
- El PDF DEBERÁ renderizar la lista de actividades de cada día con
  formato real (viñetas), no como líneas de texto con `- ` crudo.
- El punto de entrada DEBERÁ ser un botón "⋮" en el encabezado de cada
  mes en `app/(tabs)/dailys.tsx` (el listado se agrupa por mes para
  esto, antes era una lista plana).

## Requisitos (EARS) — Overtime (agregado 2026-08-29)

- El sistema DEBERÁ ofrecer, por mes, exportar todas las entradas de
  ese mes a Excel (`.xlsx`) — único formato, igual que desktop.
- El archivo DEBERÁ replicar la estructura y estilos de
  `overtimeExcel.ts` de desktop (encabezado, cabecera de
  colaborador/cédula, tabla con bordes y fórmulas `SUM`, leyenda) —
  no una hoja de datos simplificada.
- El archivo DEBERÁ incluir colaborador/cédula desde
  `overtime_month_meta` (tabla ya sincronizada con desktop, ver
  `db/schema.ts`) si existen para ese mes, o quedar en blanco si no.
- El punto de entrada DEBERÁ ser un botón "⋮" en el encabezado de mes
  ya existente en `app/(tabs)/overtime.tsx` (junto al total de horas).

## Requisitos (EARS) — Compartir (agregado 2026-08-29)

- Notes y Dailys DEBERÁN ofrecer, además de "Exportar", una acción
  "Compartir" que abre la hoja de compartir nativa del SO
  directamente con el contenido como texto (sin escribir ningún
  archivo) — más rápido que "Exportar" para el caso de uso "mandar
  esto a alguien ya" (WhatsApp, email, Slack), útil específicamente en
  mobile (sin equivalente en desktop, que no tiene hoja de compartir
  del sistema).
- Overtime NO ofrece "Compartir": no tiene una versión de texto plano
  natural (es una tabla con fórmulas) y "Exportar" ya termina en la
  hoja de compartir nativa igual — un segundo camino al mismo destino
  no aportaría nada.

## Fuera de este spec

- Cualquier variante de "guardar en una ruta elegida por el usuario"
  (Storage Access Framework en Android, document picker) en vez de la
  hoja de compartir — se evaluó y se prefirió compartir por ser el
  patrón más estándar en apps móviles y no requerir permisos
  adicionales de almacenamiento.
- Exportación de Tasks — desktop tampoco la tiene, no hay nada que
  portar.
