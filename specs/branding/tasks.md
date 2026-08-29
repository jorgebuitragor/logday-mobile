# Branding — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] Generar assets de ícono/splash/logo desde las fuentes de
      `task-manager` (Pillow), ver tabla en `design.md`.
- [x] Actualizar `app.json`: íconos, `android.adaptiveIcon.backgroundColor`,
      y `userInterfaceStyle` → `automatic` (bug de tema encontrado de
      paso).
- [x] Íconos de tabs con `lucide-react-native`, mapeados 1:1 con
      `task-manager/src/components/sidebar/Sidebar.tsx`.
- [x] Logo (`logo-mark.png`) en el header de cada tab.
- [x] Fix del bug de tab bar no traducido al cambiar idioma
      (`key={i18n.language}` en los navigators).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo en el dispositivo Android del usuario:
      - Tema "Sistema" ahora sí sigue el modo oscuro real del SO.
      - Cambiar idioma actualiza el tab bar sin necesidad de recargar
        la app a mano.
      - Íconos visibles en los 5 tabs, logo visible en el header.
      - **Nota**: el ícono de app/splash en el home screen del
        teléfono NO se actualiza probando desde Expo Go (es config
        nativa, solo aplica en un build real/EAS) — eso no es
        verificable en esta sesión de pruebas.
