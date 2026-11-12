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

## HTTP solo en la red local (12 nov 2026)

- **La regla vive en la app**, en `src/lib/serverUrl.ts`, porque Android no sabe limitar HTTP a un rango de IPs: solo lo permite o lo bloquea para todo.
  - `checkServerUrl` revisa lo que escribe el usuario y devuelve la URL con esquema, si va cifrada, o por qué no sirve (`empty`, `invalid`, `insecure-public`).
  - `resolveServerUrl` es el único paso hacia el servidor: lo usan `request` de `syncApi.ts` y `realtime.ts`. Ante un `http://` público lanza `InsecureServerUrlError`, y `SyncContext` la convierte en el mensaje traducido. El socket de `/ws` ni se abre.
  - Se interpreta a mano y no con `URL`, porque en React Native `URL#hostname` no está implementado. Se toma el host después del último `@`, para que `http://192.168.1.10@servidor.com` no pase por local.
- **Sin esquema** se asume `https://` hacia lo público. Antes se asumía siempre `http://`, como Desktop, pero en un build real eso nunca conectaba con un servidor público.
- **Sistema:**
  - Android: `usesCleartextTraffic: true` con el plugin `expo-build-properties`. Expo solo lo enciende en los builds de debug.
  - iOS: `ios.infoPlist.NSAppTransportSecurity` con `NSAllowsLocalNetworking: true` y `NSAllowsArbitraryLoads: false`. Según la documentación de Apple, la excepción de red local no pide justificación en la revisión y cubre los nombres sin dominio, los `.local` y las IPs. Desde iOS 17 las IPs dejaron de pasar por omisión, así que la excepción hace falta.
  - Revisado con `expo prebuild`: el manifiesto lleva `android:usesCleartextTraffic="true"` y el `Info.plist` solo esas dos claves.
- **Ajustes:** debajo de la URL sale en rojo el error de `http://` público, y el botón de conectar queda deshabilitado. En ámbar sale el aviso de conexión sin cifrar. Una vez conectado, el aviso se repite junto al servidor.

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

## Íconos de los accesos rápidos en Android

Android busca un recurso (drawable o mipmap) con el nombre del `icon` de cada atajo; si no existe, el lanzador muestra un círculo vacío.

- **Recursos.** El plugin de `expo-quick-actions` genera `shortcut_task`, `shortcut_note` y `shortcut_daily` como íconos adaptativos desde `androidIcons` de `app.json`. Son los glifos de Lucide del Inicio (`CheckSquare`, `FileText` y `NotebookPen`), en el color de acento sobre blanco y ocupando un tercio del lienzo, como pide Android. Los SVG fuente están en `assets/quick-actions/`.
- **Nombre por plataforma.** `quickActionIcon` elige el nombre: en iOS siguen los íconos del sistema.
- **Prueba.** Una prueba revisa que cada nombre de Android exista en `androidIcons`.

Usar el plugin destapó un problema del árbol de npm. Con `legacy-peer-deps`, `ajv-keywords@5`, que pide `ajv ^8` como peer, quedaba junto al `ajv` 6 de ESLint, y el prebuild fallaba también en EAS. Por eso `ajv ^8` está en `devDependencies`; la razón está en `.npmrc`.

## Ícono de Android y su versión con tema (12 nov 2026)

Antes, el documento ocupaba el 87 % del alto visible: las máscaras redondas le cortaban los bordes. Además, la capa monocroma era solo la silueta rellena, así que con íconos temáticos se veía un documento en blanco.

Ahora las tres capas salen de los trazos de `LogoMark` (`src/components/LogoMark.tsx`). Los SVG fuente están en `assets/icon-src/` y se pasaron a PNG de 1024 px:
- **Lienzo.** El adaptativo mide 108 unidades. El documento mide 40 de alto, centrado, dentro del círculo seguro de 66.
- **Frente** (`android-icon-foreground.png`): el documento blanco, el doblez con el acento al 24 % y la línea de tendencia en el acento.
- **Fondo** (`android-icon-background.png`): el acento `#6366f1` liso.
- **Monocroma** (`android-icon-monochrome.png`): el documento relleno, con la línea de tendencia (trazo de 3) y el doblez calados. El sistema la pinta con los colores del tema.

## Ícono de iOS: claro, oscuro y teñido (12 nov 2026)

`ios.icon` en `app.json` declara las tres variantes de iOS 18 o superior. Salen de los mismos trazos de `LogoMark`, con fuentes en `assets/icon-src/ios-*.svg`:
- **Clara:** fondo de acento a sangre completa, sin alfa y sin esquinas dibujadas; la máscara la pone iOS. Antes las esquinas redondeadas venían dibujadas sobre blanco.
- **Oscura:** el documento con su acento sobre fondo transparente; iOS pone el fondo oscuro.
- **Teñida:** el documento en blanco con la línea de tendencia y el doblez calados; iOS lo pinta con el color que elija la persona.

`expo prebuild --platform ios` genera el `AppIcon.appiconset` con las tres variantes (`luminosity` `dark` y `tinted`), y `CFBundleDisplayName` queda en "Logday". Falta verlo en un iPhone: el build de iOS necesita la cuenta de Apple Developer, y la publicación va primero en Android.
