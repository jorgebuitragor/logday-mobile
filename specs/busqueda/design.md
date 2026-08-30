# Búsqueda global — Design

Estado: implementado — ver `src/db/search.ts`, `app/search.tsx`,
`src/components/FilterChip.tsx`.

## `searchAll(query, filters)`

4 queries `LIKE '%query%'` independientes (una por tabla), sin FTS5 ni
índices especiales — no hay evidencia de que el volumen de datos de un
solo usuario en un dispositivo lo justifique todavía (ver "Por qué
LIKE y no FTS5 todavía"). `snippetFrom()` recorta el texto alrededor
de la primera coincidencia (±20/100 caracteres) para dar contexto sin
mostrar el contenido completo. `RESULT_LIMIT = 10` por grupo.

## Ranking (agregado 2026-08-29)

`FETCH_LIMIT = 40` — cada query SQL trae hasta 40 filas (no 10) antes
de rankear/filtrar, porque el ranking y los filtros de `label`/fecha
viven en JS después del fetch, no en el `WHERE`: si se pidieran solo
10 y luego se descartara la mitad por un filtro, la lista final
quedaría corta aunque hubiera más coincidencias reales sin pedir.

`scoreMatch(query, title)` da 4 niveles: título exacto (4) > título
empieza con la query (3) > título contiene la query (2) > coincidió
en otro campo pero no en el título (1, garantizado por construcción —
si la fila llegó hasta acá es porque el `WHERE` SQL matcheó algo, y si
no fue el título entonces fue `content`/`tags`/`project`/etc). El
orden anterior (fecha descendente, ya venía del `ORDER BY` de cada
query) queda como desempate porque `Array.prototype.sort` es estable.

## Filtros (agregado 2026-08-29)

`SearchFilters` vive en `search.ts` junto a `searchAll`, no en el
componente — mismo criterio que el resto de la app (los tipos de
dominio viven cerca de la capa de datos). Tres filtros se resuelven
distinto:

- **Secciones** (`kinds`) y **estado** (`statuses`, solo tasks): antes
  de tocar la base — si una sección no está activa, esa query ni
  siquiera se ejecuta (`includesKind`); `statuses` se traduce a un
  `AND status IN (...)` armado dinámicamente en el SQL de tasks.
- **Proyecto/tag** (`label`) y **rango de fecha** (`dateFrom`/`dateTo`):
  después de traer las filas, en JS (`matchesLabel`/`inDateRange`) —
  cruzan conceptos que no viven en una sola columna simple (`label`
  puede matchear `project` O cualquier elemento de `tags`, que está
  guardado como JSON-string-array, no una columna aparte) o que no
  aplican de forma uniforme a las 4 entidades (`date` es `due` en
  tasks, `fecha` en dailys/overtime, `updated` en notes — no hay una
  columna "fecha" única y consistente para armar un solo `WHERE`
  reusable).

`SearchResult` ahora carga `date`/`status`/`labels` además de lo que
ya mostraba — metadata que antes no se conservaba porque nada la
necesitaba, agregada específicamente para que estos dos filtros
puedan operar sin una segunda consulta.

`listSearchLabels()` — una query aparte (no parte de `searchAll`) que
trae los valores distintos de `project`/`tags`/`folder` de toda la
base (sin filtrar por texto) para poblar los chips del filtro de
proyecto/tag; se llama una vez al abrir el panel de filtros
(`useEffect` en `search.tsx`, condicionado a `labels.length === 0`),
no en cada tecla — son valores de catálogo, no resultados de búsqueda.

## `FilterChip` (extraído 2026-08-29)

Vivía como componente local en `app/(tabs)/notes.tsx`. Al necesitar el
mismo chip toggle en `search.tsx` (3 filas de chips: secciones,
estados, labels) se extrajo a `src/components/FilterChip.tsx` sin
cambiar su comportamiento — mismo patrón ya usado varias veces este
proyecto (extraer solo cuando aparece un segundo consumidor real, no
antes).

## Panel de filtros en `app/search.tsx`

Colapsado por defecto (`filtersOpen`, toggle con el botón
`SlidersHorizontal` junto al input, que muestra un contador cuando hay
filtros activos) — no ocupa espacio permanente en una pantalla donde
el caso común es "buscar sin filtrar". Los chips de estado
(`showStatusChips`) se ocultan si "Tasks" no está entre las secciones
activas — mostrar un filtro que no puede afectar ningún resultado
visible sería confuso. El rango de fecha reusa `AppDatePicker`
(`allowClear`) tal cual, sin componente nuevo — ya resuelve
exactamente "campo con fecha opcional + modal de calendario".

## `app/search.tsx`

Ruta modal (registrada en `app/_layout.tsx`), no un modal superpuesto
sobre la pantalla actual — mismo patrón `presentation: 'modal'` que
`task/new`, etc., más simple de razonar en Expo Router que un modal
JS propio. Debounce de 200ms sobre el input antes de disparar
`searchAll` (evita una query por tecla). Al tocar un resultado, hace
`router.back()` (cierra la búsqueda) y luego `router.push()` a la
pantalla correspondiente — en ese orden, para que el usuario vea la
navegación normal (no la búsqueda apilada debajo).

Ícono de acceso: `headerRight` en `app/(tabs)/_layout.tsx`
(`screenOptions`, visible en los 5 tabs), ícono `Search` de
`lucide-react-native` — no hay un ícono equivalente en desktop para
esto (ahí es un atajo de teclado, `Cmd+F`/`Ctrl+F`), así que el ícono
es una decisión de diseño propia de mobile, no un port.

## Bug de contraste en el input (corregido 2026-08-29)

El texto escrito no se distinguía del fondo. Causa: el color/fondo se
aplicaban al `View` contenedor (`inputWrap`), no al `TextInput` en sí
— en Android, un `TextInput` sin `backgroundColor` propio puede
heredar/mostrar el fondo por defecto del widget nativo en vez del de
su contenedor, tapando el texto según el tema activo. Corregido
aplicando `borderColor`/`backgroundColor`/`color` directo al
`TextInput` (mismo patrón que ya usan `TaskForm`/`NoteForm`/
`OvertimeForm`, que nunca tuvieron este problema por eso mismo), más
`selectionColor={theme.accent}`.

## Por qué LIKE y no FTS5 todavía

Se reconsideró al agregar más campos por entidad al `WHERE` (hasta 5
`OR LIKE` en la query de tasks) — SQLite tiene soporte FTS5 nativo que
sería más preciso y más rápido a mayor volumen. Se descartó por ahora:
requeriría una tabla virtual espejo por entidad, mantenerla
sincronizada en cada insert/update/delete, y migrar datos existentes —
costo real para un problema que hoy no existe (bases de datos
personales, de un usuario, con cientos de registros como mucho, no
miles). Queda como la mejora obvia si el volumen de datos algún día lo
justifica.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo (agregado 2026-08-29): cada combinación de
  filtros por separado (sección, estado, proyecto/tag, fecha) y
  combinados; confirmar que el contador del botón de filtros
  refleja el total activo; confirmar que buscar un `taskCode`/tag/
  `observaciones` que antes no aparecía en resultados ahora sí lo
  hace; confirmar visualmente que un resultado con match de título
  aparece antes que uno con match solo en contenido dentro del mismo
  grupo.
