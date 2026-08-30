# Exportación — Requirements

Estado: Notes implementado, pendiente de confirmación en vivo. Dailys
y Overtime pendientes (ver "Fuera de este spec").

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
| Dailys | Markdown, Texto plano, PDF | Por mes | Pendiente |
| Overtime | Excel (.xlsx) | Por mes | Pendiente |
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

## Fuera de este spec

- **Exportación de Dailys** (Markdown/Texto plano/PDF, por mes) —
  próximo checkpoint. El mecanismo compartido (`src/lib/exportFile.ts`)
  ya está listo para reusar; falta la función de armado de contenido
  específica de Dailys (agregación de un mes de `daily_entries`,
  mismo formato que `dailyMonthExport.ts` de desktop) y la UI que la
  dispara (el listado de Dailys no tiene hoy ningún menú de más
  acciones por mes).
- **Exportación de Overtime** (Excel, por mes) — próximo checkpoint.
  Requiere evaluar una librería de escritura de `.xlsx` en JS puro
  (candidata: `exceljs`) ya que desktop usa `xlsx-js-style`
  (dependencia de Node/navegador, no directamente portable) para
  generar un archivo con estilos/fórmulas — alcance de fidelidad
  (¿replicar el estilo exacto de celdas o solo los datos?) sin decidir
  todavía.
- Cualquier variante de "guardar en una ruta elegida por el usuario"
  (Storage Access Framework en Android, document picker) en vez de la
  hoja de compartir — se evaluó y se prefirió compartir por ser el
  patrón más estándar en apps móviles y no requerir permisos
  adicionales de almacenamiento.
- Exportación de Tasks — desktop tampoco la tiene, no hay nada que
  portar.
