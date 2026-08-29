# Pantalla de Ajustes — Design

Estado: implementado — ver `app/(tabs)/settings.tsx`.

## Estructura

Dos secciones (`Section`, componente local del archivo — no se
extrajo a `src/components/` porque hoy solo tiene un consumidor):
"Tema" y "Idioma", cada una una lista de `OptionRow` (label + check ✓
si está seleccionada). `Section`/`OptionRow` son componentes internos
del mismo archivo, no exportados — si en el futuro Ajustes crece con
más secciones (no hay señal de eso todavía), ahí se justifica
moverlos a `src/components/`.

Fuente de las opciones y su estado activo:

- Tema: `useThemePreference()` de `src/theme/ThemeContext.tsx`
  (`temas/design.md`).
- Idioma: `i18n.language` (estado activo) + `setLanguagePreference`
  de `src/i18n/index.ts` (`i18n/design.md`).

No hay estado propio de esta pantalla — es una vista delgada sobre los
dos sistemas que ya llevan su propio estado/persistencia.

## Explícitamente pendiente

- Ninguna — el alcance de este spec es completo con lo implementado.
  Crecer con más ajustes es un spec futuro, no una extensión de este.
