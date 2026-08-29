# i18n — Requirements

Estado: en diseño.

## Contexto

**Corrección (2026-08-29, tras revisión en vivo):** la afirmación
original de este spec — "ningún cliente de Logday tiene i18n hoy" —
era incorrecta. `task-manager` **sí tiene** i18n: una implementación
propia hecha a mano (`src/lib/i18n.ts`, sin librería externa, por eso
no apareció al buscar dependencias de i18n en su `package.json`),
`Language = 'es' | 'en'` — mismos dos idiomas que se habían elegido
acá de forma independiente. `logday-web` sigue sin i18n (confirmado
explícitamente en su propio spec de temas). Esto cambia el criterio de
diseño: el diccionario de `task-manager/src/lib/i18n.ts` es la fuente
de verdad del vocabulario en español (igual que `App.css` lo es para
colores) — no se traduce a criterio propio, se copia. Ver
`design.md`, "Vocabulario: copiado de `task-manager`, no inventado".

## Requisitos (EARS)

### Idiomas y librería

- El sistema DEBERÁ soportar **español** (default) e **inglés** —
  decidido con el usuario 2026-08-29.
- El sistema DEBERÁ usar **i18next + react-i18next** — estándar de
  facto en el ecosistema RN/Expo, decidido con el usuario 2026-08-29.
- El sistema DEBERÁ detectar el idioma del dispositivo
  (`expo-localization`) para elegir el idioma inicial, cayendo a
  español si el idioma del dispositivo no es `es` ni `en`.

### Cobertura

- Todo string visible al usuario en una pantalla nueva o modificada
  DEBERÁ venir de un diccionario de traducción (`t('clave')`), nunca
  como literal inline en el JSX.
- Los 2 diccionarios (`es`, `en`) DEBERÁN mantenerse con las mismas
  claves — una clave presente en uno y ausente en el otro se considera
  un defecto, no un caso aceptable.

### Selector manual (agregado 2026-08-29)

- El sistema DEBERÁ permitir al usuario elegir explícitamente
  español/inglés desde el tab de Ajustes, y recordar esa elección
  entre sesiones — mismo criterio que el selector de tema (ver
  `temas/requirements.md`).

## Fuera de este spec

- Formateo de fechas/números localizado más allá de lo que ya hace
  `Intl` nativo — no se introduce una librería aparte para esto en
  este spec.
- Traducir contenido generado por el usuario (títulos de tasks, notas,
  etc.) — solo el chrome de la UI se traduce, nunca los datos.
