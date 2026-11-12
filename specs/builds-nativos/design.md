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
  - `owner` y `extra.eas.projectId`: los escribió `eas init` el 12 nov 2026 al crear el proyecto `@jbuitrago1298/logday-mobile` en expo.dev.
- **Firma de Android:** la llave de subida (keystore) la generó EAS en el primer build y vive en los servidores de Expo (credenciales remotas). Para Play se usa Play App Signing: Google firma lo que se publica y esta llave solo sirve para subir. Conviene descargar una copia de respaldo con `eas credentials`.
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

## Primer build (12 nov 2026)

`preview` de Android en EAS, sin errores. El APK solo pide en ejecución el permiso de notificaciones. Los demás se conceden al instalar sin preguntar:
- de la app: `INTERNET`, `VIBRATE` y `RECEIVE_BOOT_COMPLETED`;
- de `expo-notifications`: `WAKE_LOCK`, `ACCESS_NETWORK_STATE`, `c2dm.RECEIVE` de Firebase y los de insignias de varios lanzadores;
- de `expo-secure-store`: `USE_BIOMETRIC` y `USE_FINGERPRINT`.

**Arranque en el emulador.** Con el emulador saturado (dibujo por software y la Mac con carga 11), el arranque en frío tardó de 10 a 24 s y hubo avisos de ANR. Con la carga normal, el APK precompilado como lo instala Play tardó 1,1 a 2,7 s. Hay que medirlo en un teléfono físico.
