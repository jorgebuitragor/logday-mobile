# Inicio — Tareas

Estado: implementado, pendiente confirmación en vivo.

- [x] `src/lib/homeSummary.ts` con pruebas (6): vencimientos, notas
      recientes con sellos mezclados, semana con festivos, ausencias y
      horas extra, semana que cruza de año, lunes de la semana, vacío.
- [x] Pantalla `app/(tabs)/index.tsx` con captura, daily, vencimientos,
      semana y notas recientes; bienvenida si no hay nada.
- [x] Pestañas: Inicio primero; Tareas a `tasks.tsx`; Ajustes al stack
      (`app/settings/index.tsx`) con engranaje en la cabecera del Inicio.
- [x] Textos es/en.
- [x] En Expo Go, en el simulador de iOS (iPhone 17, tema claro, 11 nov
      2026): la pantalla carga con datos reales, una tarea de hoy aparece
      en "Vencen hoy" y el engranaje abre Ajustes. Se corrigieron dos
      cosas: el botón de volver de Ajustes decía "(tabs)" y "Tu semana"
      tenía el ícono de calendario tachado.
- [x] En Expo Go, en el emulador de Android (Pixel 8, Android 16, en
      inglés, 12 nov 2026): la bienvenida con la base vacía, y una tarea de
      hoy en "Due today".
- [ ] Falta: un teléfono chico, el tema oscuro, y que una tarea editada en
      Web aparezca sin salir del Inicio.
