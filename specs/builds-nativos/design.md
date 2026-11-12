# Builds nativos (EAS) — Design

## Configuración

- **`eas.json`**
  - `cli.appVersionSource: "remote"`: EAS guarda el número de build y `production` lo sube con `autoIncrement`. Así nadie lo edita a mano ni lo olvida.
  - `preview` usa `android.buildType: "apk"`, que se instala directo; `production` deja el AAB por omisión, el formato que pide Play.
  - Sin `node` fijo: se usa la imagen de EAS que corresponde al SDK 57.
- **`app.json`**
  - `android.package` e `ios.bundleIdentifier` en `dev.logday.app`.
  - `ios.config.usesNonExemptEncryption: false`.
  - `android.blockedPermissions`: `SYSTEM_ALERT_WINDOW` y los de almacenamiento externo, que las plantillas de Expo y `expo-file-system` agregan por omisión. La app no los usa:
    - el selector de documentos va por el sistema (`expo-document-picker`);
    - los archivos quedan en carpetas privadas (`Paths.cache`, `Paths.document`).
  - `owner` y `extra.eas.projectId` los escribe `eas init` al crear el proyecto en expo.dev.
- **`expo-dev-client`:** lo necesita el perfil `development`. En los builds `preview` y `production` no se incluye el menú de desarrollo.

## Verificación hecha sin EAS

Se generó el proyecto Android (`expo prebuild`) en una copia aparte, sin tocar el repo:

- `applicationId` queda en `dev.logday.app`.
- `allowBackup` queda en `false`.
- Los tres permisos bloqueados quedan con `tools:node="remove"`.
- Las librerías solo agregan `INTERNET`, `RECEIVE_BOOT_COMPLETED` y `POST_NOTIFICATIONS`. No hay `SCHEDULE_EXACT_ALARM`, que Play obliga a justificar.

## Comandos

```bash
eas init                                   # una vez: crea el proyecto en expo.dev
eas build -p android --profile preview     # APK para probar en el teléfono
eas build -p android --profile production  # AAB para Play
```
