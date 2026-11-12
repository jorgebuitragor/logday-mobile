# Builds nativos (EAS) — Tasks

- [x] `eas.json` con los perfiles `development`, `preview` y `production`, y número de build remoto.
- [x] `dev.logday.app` en Android y en iOS, y la declaración de cifrado de iOS.
- [x] Bloquear los permisos que la app no usa, y revisar el manifest con `expo prebuild`.
- [x] `expo-dev-client` para el perfil de desarrollo.
- [x] `eas init`: proyecto `@jbuitrago1298/logday-mobile` creado en expo.dev el 12 nov 2026, con OK de Jorge. La llave de firma de Android (keystore) la generó EAS y queda guardada en los servidores de Expo.
- [x] Primer build `preview` de Android (EAS, 12 nov 2026): APK de 112 MB, `dev.logday.app` 1.0.0, build 1, target API 36. Instalado y probado en el emulador (Pixel 8, Android 16).
- [ ] Instalarlo en un teléfono físico.
- [ ] Probar en ese build lo que Expo Go no deja:
  - [x] el splash nativo: el ícono sobre el fondo claro, que da paso al Inicio sin pantalla vacía;
  - [ ] el splash animado (el del wordmark) en el build: el emulador dibuja por software y no se pudo capturar cuadro a cuadro;
  - [x] compartir texto con Logday: abre "Guardar en Logday" con el texto y lo guarda como tarea en `inbox` (título y contenido bien separados);
  - [x] los accesos rápidos: los tres aparecen al mantener presionado el ícono y "Daily de hoy" abre el de hoy;
  - [x] los íconos de los accesos rápidos en Android: salían como círculos vacíos, porque `task`, `compose` y `date` son símbolos de iOS. Arreglado con `androidIcons` del plugin y `quickActionIcon` (los glifos de Lucide del Inicio en `assets/quick-actions/`). En el segundo build se ven los tres y "Nueva tarea" abre el formulario;
  - [ ] tocar una notificación;
  - [ ] "reducir movimiento".
- [ ] Decidir HTTP sin cifrar y el nombre bajo el ícono (ver requirements). En el cajón de apps del Pixel, "Logday Mobile" se corta como "Logday Mob…".
- [ ] Build `production` (AAB) y subida a la prueba interna de Play (con OK de Jorge).
