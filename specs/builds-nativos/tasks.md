# Builds nativos (EAS) — Tasks

- [x] `eas.json` con los perfiles `development`, `preview` y `production`, y número de build remoto.
- [x] `dev.logday.app` en Android y en iOS, y la declaración de cifrado de iOS.
- [x] Bloquear los permisos que la app no usa, y revisar el manifest con `expo prebuild`.
- [x] `expo-dev-client` para el perfil de desarrollo.
- [ ] `eas init`: crear el proyecto en expo.dev (con OK de Jorge).
- [ ] Primer build `preview` de Android, instalado en un teléfono físico.
- [ ] Probar en ese build lo que Expo Go no deja:
  - el splash nativo y la máscara de ícono de Android 12+;
  - compartir con Logday y los accesos rápidos;
  - tocar una notificación;
  - "reducir movimiento".
- [ ] Decidir HTTP sin cifrar y el nombre bajo el ícono (ver requirements).
- [ ] Build `production` (AAB) y subida a la prueba interna de Play (con OK de Jorge).
