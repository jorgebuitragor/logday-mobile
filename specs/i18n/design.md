# i18n — Design

Estado: implementado — ver `src/i18n/`.

## Setup

`src/i18n/index.ts`: inicializa `i18next` con `react-i18next`,
recursos `es`/`en` importados de `src/i18n/locales/es.json` y
`en.json`. Idioma inicial: `Localization.getLocales()[0]?.languageCode`
(`expo-localization`) si es `es`/`en`, si no `es` por default
(requisito "detectar idioma del dispositivo... cayendo a español" en
`requirements.md`). Se importa una sola vez desde `app/_layout.tsx`
(efecto de inicialización de módulo, mismo patrón que cualquier setup
de librería en RN — no hace falta un provider propio, `react-i18next`
ya expone `useTranslation()` globalmente una vez inicializado
`i18next`).

## Estructura de claves

Namespace único (`translation`, el default de i18next), claves planas
por pantalla/componente para que sea fácil ver qué falta en cada
diccionario:

```json
{
  "tabs": { "tasks": "Tasks", "notes": "Notes", ... },
  "taskList": { "empty": "...", "loading": "..." },
  "taskForm": { "title": "...", "status": "...", ... },
  "db": { "initializing": "...", "error": "DB error: {{message}}" }
}
```

`{{message}}` es interpolación estándar de i18next (usada en
`db.error`, que necesita insertar el mensaje real del error).

## Cobertura aplicada

Mismas pantallas que migró `temas/` (son el mismo cambio, tema +
idioma se migran juntos por pantalla, no en dos pasadas separadas):
`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`,
`app/task/new.tsx`, `app/task/[id].tsx`, `src/components/TaskForm.tsx`,
`src/components/EntityCountScreen.tsx`.

Nota: los labels de `status` (`todo`/`in-progress`/`done`) en
`TaskForm` **no** se tradujeron — son el valor real guardado en SQLite
(`esquema-datos/design.md`, `CHECK (status IN ('todo','in-progress','done'))`),
no texto de UI. Traducir el label visible sin tocar el valor
almacenado queda pendiente (ver "Explícitamente pendiente").

## Vocabulario: copiado de `task-manager`, no inventado (corregido 2026-08-29)

`task-manager/src/lib/i18n.ts` tiene un diccionario `es`/`en` hecho a
mano (ver corrección en `requirements.md`). Bug real encontrado: el
diccionario `es` de mobile tenía `tabs.tasks`/`tabs.notes`/`tabs.overtime`
en **inglés literal** ("Tasks"/"Notes"/"Overtime") — se veían en
inglés aunque el idioma activo fuera español. Corregido copiando los
valores reales de `task-manager` (`sidebar` section, línea ~208):

| Clave | Desktop ES | Desktop EN | Nota |
|---|---|---|---|
| tasks | Tareas | Tasks | |
| notes | Notas | Notes | |
| dailys | Dailys | Dailys | sin traducir en ambos — término de producto, no un sustantivo común |
| overtime | Extras | Overtime | |

También alineados con el diccionario `tasks` de desktop (líneas
322-380 ES / 1228+ EN): `taskForm.titlePlaceholder` → "Título de la
tarea" (no "de la task"), `taskForm.newTitle`/`editTitle` → "Nueva
tarea"/"Editar tarea", `taskForm.notFound` → "Tarea no encontrada.",
`taskList.empty` → "Sin tareas. ¡Crea la primera!" (calcado de
`emptyAll` en desktop, mismo mensaje en inglés: "No tasks yet. Create
the first one!").

## Selector manual y persistencia (agregado 2026-08-29)

`setLanguagePreference(lang)` en `src/i18n/index.ts`: llama
`i18n.changeLanguage(lang)` (todos los componentes con
`useTranslation()` re-renderizan automáticamente, sin plumbing
adicional) y persiste en AsyncStorage (`languagePreference`). Al
inicializar el módulo, además del idioma de dispositivo síncrono ya
existente, se lee el valor persistido de forma asíncrona y se aplica
si difiere — mismo trade-off de "flash breve" que la preferencia de
tema (ver `temas/design.md`), aceptado por la misma razón.

UI: `app/(tabs)/settings.tsx`, sección "Idioma" con 2 filas (Español/
English), check en el idioma activo (`i18n.language`).

## Explícitamente pendiente

- Traducir el label mostrado de `status` sin afectar el valor
  almacenado (hoy se ve el string en inglés tal cual, ej. "todo").
- Namespaces separados por feature si el diccionario único crece
  demasiado — no hay señal de que haga falta con 2 pantallas.
