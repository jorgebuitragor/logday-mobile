# Builds nativos (EAS) — Requirements

Estado: en progreso. La configuración ya está y hay APK `preview`; falta probarlo en un teléfono y el build para Play.

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

### Servidores de sync por HTTP (decidido por Jorge el 12 nov 2026)

En un build real, Android 9 o superior bloquea por omisión las conexiones `http://`, e iOS también, por App Transport Security. Muchas instalaciones propias de `logday-server` corren por HTTP en la red interna, y para una IP privada no se puede pedir un certificado público. Cerrar HTTP del todo las dejaría por fuera; abrirlo para cualquier servidor mandaría el token y el contenido en texto plano por internet.

- Cuando la URL del servidor apunte a la red local, la app DEBERÁ aceptar `http://`. Cuenta como red local: `localhost`, las IPs privadas (`10.x`, `172.16–31.x`, `192.168.x`), de enlace local (`169.254.x`, `fe80::`), las IPv6 ULA (`fc00::/7`), las de CGNAT (`100.64.0.0/10`, la de Tailscale), los nombres `.local` y los nombres sin dominio (`nas`).
- Cuando la URL apunte a un servidor público con `http://`, la app NO DEBERÁ conectarse, y DEBERÁ explicar en Ajustes que hace falta `https://`.
- Cuando la URL no traiga esquema, la app DEBERÁ usar `http://` hacia la red local y `https://` hacia lo demás.
- Mientras la conexión vaya por HTTP, Ajustes DEBERÁ avisar que no va cifrada, al escribir la URL y una vez conectado.
- En iOS, la app NO DEBERÁ usar las excepciones de ATS que Apple obliga a justificar en la revisión (`NSAllowsArbitraryLoads` y las de cada dominio). Solo `NSAllowsLocalNetworking`, que no la pide.
- Queda por fuera un servidor con nombre de dominio interno (`logday.empresa.com`) por HTTP: se usa su IP o se le pone HTTPS. Se revisa si alguien lo necesita.

## PENDIENTE DE DECISIÓN

- **Workflow de release por tag** que adjunte el APK al Release de GitHub, como el de Desktop. Va después del primer build.
