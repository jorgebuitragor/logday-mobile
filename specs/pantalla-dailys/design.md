# Pantalla de Dailys — Design

Estado: implementado — ver `src/db/dailyEntries.ts`, `app/(tabs)/dailys.tsx`,
`app/daily/[date].tsx`, `src/components/DailyActivityList.tsx`,
`src/lib/dailyCopyText.ts`.

## Capa de datos: `src/db/dailyEntries.ts`

Sin cambios respecto a la versión anterior — el esquema SQLite
(`daily_entries.content TEXT`) no cambia; lo que cambia es cómo se
interpreta y edita ese string en la UI (ver `DailyActivityList.tsx`
abajo).

- `listDailyEntries()` — no eliminados y `content != ''`, orden por
  `date DESC`.
- `getDailyEntry(date)` / `getPreviousDailyEntry(date)` — el segundo
  es `WHERE date < ? AND content != '' ORDER BY date DESC LIMIT 1`,
  la aproximación simplificada mencionada en `requirements.md`.
- `upsertDailyEntry(date, content)` — `INSERT ... ON CONFLICT(date) DO UPDATE`,
  mismo upsert que el endpoint del servidor.
- `softDeleteDailyEntry(date)`.

## `src/components/DailyActivityList.tsx` (nuevo)

Componente central de esta revisión. Reemplaza el `TextInput
multiline` plano por una lista de actividades editable, puerto del
modelo de `ActivityList` dentro de
`task-manager/src/components/daily/DailyEditor.tsx`.

**Formato de serialización** — copiado literal del `parseItems`/
`serializeItems` de desktop, para mantener interoperabilidad exacta
(un daily editado en mobile se ve y se edita igual al abrirlo en
desktop, y viceversa):

- Cada actividad es una línea física `"- texto"` en el string
  almacenado.
- Un salto de línea dentro de una actividad se escapa como `\n`
  literal; una barra invertida, como `\\`.
- Líneas que no empiezan con `"- "` se ignoran al parsear (mismo
  comportamiento que desktop).

**Interacciones portadas:**

- Añadir actividad — input de una línea al final de la lista,
  confirma con la tecla de retorno del teclado (`onSubmitEditing`) o
  al perder el foco si queda texto sin confirmar (mismo `onBlur` de
  seguridad que usa desktop).
- Editar in-line — tap sobre el texto de una actividad la convierte
  en un `TextInput`; confirma con retorno o al perder el foco; si se
  deja vacía, se elimina (mismo comportamiento que `commitEdit` en
  desktop).
- Eliminar actividad — botón de papelera por fila, sin confirmación
  (igual que el botón `X` de desktop; la confirmación solo aplica al
  borrado del daily completo).
- Reordenar — **botones subir/bajar por actividad**, no
  drag-and-drop. Decisión deliberada: el drag-and-drop de desktop usa
  eventos de puntero (`pointerdown`/`pointermove`/`pointerup`) con
  histéresis y detección de fila bajo el cursor — un patrón pensado
  para mouse que no traduce bien a gestos táctiles sin una librería
  de listas arrastrables (`react-native-draggable-flatlist` u
  similar). Se evaluó y se optó por botones subir/bajar: cero
  dependencias nuevas, funciona igual en cualquier dispositivo/tamaño
  de pantalla, y el volumen de reordenamientos típico en un daily
  (unas pocas actividades) hace que el costo de "varios taps" sea
  bajo frente a la complejidad y el riesgo de una librería de drag
  táctil.
- Arrastrar una actividad entre el panel "Previo" y el "Seleccionado"
  (cross-panel drag de desktop) — **no portado**: es una extensión
  directa del drag-and-drop ya no portado: en su lugar, mover una
  actividad de día se hace editándola manualmente en ambos paneles
  (eliminar de uno, añadir en el otro) — engorroso pero infrecuente,
  y evita añadir una segunda mecánica de drag entre componentes.

**No portado** (ver "Fuera de este spec" en requirements.md):
promover a task, autocompletar tasks existentes (`#codigo-tarea`),
menú contextual con "copiar actividad individual".

**Edición multilínea dentro de una actividad**: desktop soporta
Shift+Enter en el textarea de edición para insertar un salto de línea
dentro de una misma actividad (ver escape `\n` arriba). En mobile,
tanto el input de "nueva actividad" como el de edición in-line son de
una sola línea — reproducir de forma confiable la distinción
Enter-confirma vs. Shift+Enter-inserta-salto en un teclado táctil no
es sencillo y el caso de uso (una actividad con salto de línea
interno) es raro. Si una actividad ya tiene un salto de línea interno
(creada en desktop) y no se edita desde mobile, se conserva intacta
al guardar — solo se pierde la comodidad de editarla como texto
multilínea si se toca desde mobile.

## `src/lib/dailyCopyText.ts`

Sin cambios de formato de serie respecto a la versión anterior:
versión simplificada de `buildDailyCopyText` de desktop
(`task-manager/src/lib/colombianHolidays.ts`), mismo formato de
mensaje ("Buenos días. / El día X: / ... / El día de hoy, Y: / ..."),
sin el nombre del día de la semana en español (desktop lo formatea a
mano con arrays `DIAS`/`MESES`) — se usa la fecha ISO tal cual.
Copiado al portapapeles vía `expo-clipboard` (`Clipboard.setStringAsync`).

## Pantalla `app/daily/[date].tsx`

Dos paneles apilados (no lado a lado como desktop — pantalla angosta),
ambos usando `DailyActivityList`:

- **"Previo"**: si `getPreviousDailyEntry(date)` devuelve una entrada,
  el panel es una `DailyActivityList` completamente editable sobre esa
  fecha (cada cambio hace `upsertDailyEntry(previousDate, ...)`
  directo). Si no hay ninguna entrada anterior no vacía, se muestra el
  mensaje `noPrevious` en vez de una lista vacía — no hay una fecha
  conocida a la que guardar en ese caso (limitación heredada de la
  simplificación "entrada no vacía más reciente" en vez de "día hábil
  anterior").
- **"Seleccionado"**: `DailyActivityList` con `accent` (borde
  destacado) sobre `date`.
- Insignia "HOY" junto a la fecha cuando `date` es el día actual (como
  `todayBadge` en desktop).
- Panel de **vista previa** del mensaje formateado (`previewTitle`,
  nueva sección que no existía en la primera versión, más cercana a la
  de desktop) con acceso directo a "Copiar formato" desde ahí también.

**Autosave por operación, sin botón "Guardar"**: cada
añadir/editar/reordenar/eliminar actividad llama a `upsertDailyEntry`
de inmediato — reemplaza el botón "Guardar" manual de la primera
versión. A diferencia del autosave con debounce de desktop (que
debounce porque el origen es tecleo continuo en un textarea), cada
operación de lista aquí ya es un evento discreto, así que no hace
falta debounce. Cerrar la pantalla (gesto atrás / header) no requiere
guardar explícito, igual que en desktop.

Se sigue usando `ConfirmDeleteModal` + `useConfirmDelete` sin cambios
para el borrado del daily completo.

## Listado `app/(tabs)/dailys.tsx`

- FAB con label "Hoy" (no ícono "+") — navega a `/daily/<fecha de
  hoy>`, que puede ser una entrada nueva (vacía, se crea al añadir la
  primera actividad) o existente. No hay ruta `/daily/new` separada —
  la clave natural (`date`) hace que "crear" y "editar" sean la misma
  pantalla, a diferencia de Task/Note.
- Ícono de estado vacío: `CalendarDays` de `lucide-react-native`
  (mismo ícono que usa desktop en `DailyList.tsx` para su estado
  vacío), vía el componente compartido `EmptyState`.
- La vista previa de cada fila en la lista ahora parsea las
  actividades (`parseActivityItems`) y las une con `" · "` en vez de
  mostrar el string crudo con los guiones `"- "` de cada línea.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
