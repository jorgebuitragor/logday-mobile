# Captura rápida — Tareas

Estado: implementado, pendiente de probar en un build propio.

- [x] `expo-quick-actions` ~6.0.2 y `expo-share-intent` ~8.0.1 (la
      versión del SDK 57), con el plugin de compartir en `app.json`.
- [x] Atajos: `src/lib/quickActions.ts` con prueba de las rutas (2).
- [x] Compartir: `src/lib/shareCapture.ts` con pruebas (6),
      `app/capture.tsx`, provider y navegación en `app/_layout.tsx`,
      `app/+native-intent.tsx`.
- [x] Apagado en Expo Go; comprobado que el bundle de Metro resuelve.
- [x] Textos es/en.
- [ ] En el build de desarrollo de la fase 2 (Android): mantener pulsado
      el ícono y probar los tres atajos, con la app cerrada y abierta;
      compartir un enlace desde Chrome y un texto desde otra app, y
      guardarlos como tarea y como nota.
- [ ] Íconos propios de los atajos en Android (plugin `androidIcons`).
