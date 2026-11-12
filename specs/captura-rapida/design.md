# Captura rápida — Design

## Librerías (compatibles con el SDK 57)

- `expo-quick-actions` ~6.0.2 (peer `expo: *`). Atajos dinámicos; no
  necesita config plugin si no hay íconos propios.
- `expo-share-intent` ~8.0.1. La 9 pide el SDK 58. Su plugin agrega el
  `intent-filter` `SEND` de `text/*` a `MainActivity` y la pasa a
  `launchMode="singleTask"` (comprobado con `expo config --type
  introspect`).

Las dos cargan su módulo nativo como opcional. En Expo Go los atajos no
hacen nada y `ShareIntentProvider` se monta con `disabled` (detectado
con `Constants.executionEnvironment`), así que la app sigue abriendo.

## Piezas

- `src/lib/quickActions.ts`:
  - `quickActionHref` (puro) traduce el id del atajo a la ruta. Se usa
    un id y no un `href` fijo, porque "Daily de hoy" depende del día en
    que se toca.
  - `registerQuickActions` registra los atajos con los textos del idioma
    actual y los íconos del sistema en iOS. En Android van sin ícono
    propio por ahora.
  - `listenQuickActions` atiende el atajo que abrió la app (una vez) y
    los que se toquen después.
- `src/lib/shareCapture.ts` (puro): `draftFromShare` arma el texto
  propuesto; `splitCapture` es el de Desktop.
- `app/capture.tsx`: el formulario (Tarea o Nota, texto editable).
  Guarda con `createTask` (proyecto `inbox`) o `createNote` y abre lo
  creado. Al guardar o cancelar limpia el share intent.
- `app/_layout.tsx`: `ShareIntentProvider` alrededor de la app. Con la
  base lista, registra los atajos y, si llega algo compartido, navega a
  `/capture`.
- `app/+native-intent.tsx`: el enlace `dataUrl=` que usa iOS lleva a
  `/capture`. En Android no hace falta: "Compartir" llega como intent
  `SEND` y la librería lo lee al montar o al volver al frente.

## Por qué no se probó en un teléfono

Ninguna de las dos funciona en Expo Go. La prueba queda para el build
de desarrollo de la fase 2, que no se arranca sin el OK de Jorge.
