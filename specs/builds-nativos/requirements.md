# Builds nativos (EAS) — Requirements

Estado: en progreso. La configuración ya está; falta el primer build en EAS y probarlo en un teléfono.

## Contexto

Hasta la 1.0, Logday Mobile solo se probó en Expo Go. Para publicar en las tiendas (Android primero) hacen falta instaladores propios. También se necesitan para probar lo que Expo Go no deja: el splash nativo, compartir con Logday, los accesos rápidos y tocar una notificación. Es la fase 2 del plan de publicación del vault.

## Requisitos (EARS)

- La app DEBERÁ identificarse como `dev.logday.app` en Android (`package`) y en iOS (`bundleIdentifier`). Ese identificador no se puede cambiar después de publicar.
- El sistema DEBERÁ tener tres perfiles de build en `eas.json`:
  - `development`: build de desarrollo con `expo-dev-client`, para instalar a mano.
  - `preview`: APK de Android para instalar a mano, igual a producción pero sin pasar por la tienda.
  - `production`: AAB de Android y build de iOS para las tiendas.
- El número de build (`versionCode` / `buildNumber`) DEBERÁ subir solo en cada build de producción, y nunca a mano. La versión visible (`version` de `app.json`) DEBERÁ cambiarse a mano, una vez por release.
- El instalador de Android NO DEBERÁ pedir permisos que la app no usa. Hoy usa los siguientes:
  - Internet, para el sync.
  - Las notificaciones (`POST_NOTIFICATIONS`).
  - Reprogramarlas al reiniciar (`RECEIVE_BOOT_COMPLETED`).
  - Vibrar.
- En iOS, la app DEBERÁ declarar que no usa cifrado sujeto a control de exportación: solo HTTPS del sistema.
- Los builds DEBERÁN hacerse en EAS (nube de Expo) y firmarse así:
  - Android: Play App Signing, con la llave de subida gestionada por EAS.
  - iOS: certificados gestionados por EAS.

- El nombre bajo el ícono DEBERÁ ser "Logday" (decidido por Jorge el 12 nov 2026; "Logday Mobile" se cortaba en el lanzador). El nombre de la ficha de la tienda es aparte.
- En Android 13 o superior, con los íconos temáticos activados, el ícono DEBERÁ tomar los colores del tema del sistema como el resto de apps, y seguir mostrando el documento con su doblez y la línea de tendencia.
- El ícono de Android DEBERÁ caber en la zona segura del ícono adaptativo, para que ninguna máscara del lanzador (círculo, squircle, cuadrado) le corte el documento.

## PENDIENTE DE DECISIÓN

- **HTTP sin cifrar.** En un build real, Android 9 o superior bloquea por omisión las conexiones `http://`, e iOS también, por App Transport Security. En Expo Go sí funcionan. Un servidor de sync en la red local con `http://192.168.x.x:8080` dejaría de conectar. Hay tres opciones:
  - Solo HTTPS, que es lo más seguro y lo que piden las tiendas.
  - Permitir HTTP en general (`usesCleartextTraffic` en Android y `NSAllowsArbitraryLoads` en iOS), que obliga a justificarlo ante Apple.
  - En iOS, permitir solo la red local (`NSAllowsLocalNetworking`). Android no tiene un equivalente para IPs arbitrarias.
- **Workflow de release por tag** que adjunte el APK al Release de GitHub, como el de Desktop. Va después del primer build.
