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

## Íconos (agregado 2026-08-29)

Cada sección tiene un ícono de `lucide-react-native` junto al título
(`Sun` Tema, `Languages` Idioma, `ShieldAlert` Comportamiento), y cada
fila de tema tiene el suyo (`Smartphone` Sistema, `Sun` Claro, `Moon`
Oscuro) — coloreado con `theme.accent` cuando está seleccionada,
`theme.textSecondary` si no. Las filas de idioma no llevan ícono
propio (no hay un ícono claro que distinga "Español" de "English" sin
recurrir a banderas, que traen su propia complejidad de licencia/
representación — se dejó fuera).

## Explícitamente pendiente

- Íconos por idioma (banderas u otro): fuera de alcance, ver arriba.
- Crecer con más ajustes es un spec futuro, no una extensión de este.
