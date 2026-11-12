# Splash — Requirements

Estado: implementado (probado en Expo Go en iOS y Android; el splash
nativo, pendiente del build propio).

## Contexto

Antes, al abrir la app se veía el texto "Inicializando DB…" sobre el
fondo del tema. Jorge pidió el 12 nov 2026 un splash con solo el ícono de
Logday, la tipografía y los colores de la marca, con una animación, y
probado en los distintos temas.

## Requisitos (EARS)

- Al abrir la app, el sistema DEBERÁ mostrar solo el ícono de Logday y
  el wordmark `log` + `day`, en JetBrains Mono SemiBold y con "day" en el
  color de acento, como la landing (`logday-site`).
- Los colores DEBERÁN ser los del tema activo, cualquiera de los 8: el
  fondo (`bgBase`), el texto (`textPrimary`) y el acento del ícono y de
  "day". Con el tema Sistema, los del modo claro u oscuro del teléfono.
- El sistema DEBERÁ animar la entrada en menos de un segundo: el ícono
  aparece con un leve zoom, la línea de tendencia del documento se
  dibuja y el wordmark sube y aparece. Cuando la app esté lista, el
  splash DEBERÁ desvanecerse y dejar ver la app, ya montada debajo.
- El splash NO DEBERÁ retrasar el arranque más que lo que dura su
  entrada (unos 0,7 s más la salida).
- Con "reducir movimiento" activado en el sistema, el splash NO DEBERÁ
  animarse.
- El splash nativo (antes de cargar JavaScript) DEBERÁ mostrar el ícono
  sobre el fondo del tema claro u oscuro del sistema, y quedarse hasta
  que el splash de la app pinte su primer cuadro, sin saltos a una
  pantalla vacía. Si el tema o la fuente no llegan en 3 s, el splash de
  la app se muestra igual.
- Para lectores de pantalla, el splash DEBERÁ anunciarse como "cargando".

## Fuera de este spec

- El splash nativo de Expo Go: en Expo Go siempre se ve el de Expo Go.
- Un splash nativo por tema: el sistema solo distingue claro y oscuro.
