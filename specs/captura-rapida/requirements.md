# Captura rápida — Requirements

Estado: implementado (pendiente de probar en un build propio, fase 2).

## Contexto

Parte de las funciones nuevas de la 1.0 (vault: "Funciones nuevas de
Mobile 1.0 (plan)"). Jorge decidió el 11 nov 2026 incluir en la 1.0 los
atajos del ícono y "Compartir con Logday"; el widget de Android queda
para la 1.1.

## Requisitos (EARS)

- Al mantener pulsado el ícono de Logday, el sistema DEBERÁ ofrecer
  "Nueva tarea", "Nueva nota" y "Daily de hoy", que abren esas
  pantallas. "Daily de hoy" DEBERÁ abrir el día en que se toca.
- Cuando otra app comparta texto o un enlace con Logday, el sistema
  DEBERÁ abrir un formulario corto con el texto ya puesto para guardarlo
  como tarea o como nota. La primera línea DEBERÁ ser el título y el
  resto, el contenido (el mismo criterio que la captura rápida de
  Desktop).
- Un enlace con título DEBERÁ proponerse como "título\nenlace", sin
  repetir el enlace si el texto ya lo trae.
- Las tareas capturadas DEBERÁN ir a la bandeja de entrada (proyecto
  `inbox`, el mismo de Desktop).
- Al guardar, el sistema DEBERÁ abrir lo que creó para terminar de
  completarlo. Cancelar NO DEBERÁ crear nada.
- En Expo Go, donde no hay módulos nativos para esto, la app DEBERÁ
  seguir funcionando con la captura apagada.

## Fuera de este spec

- Widget de la pantalla de inicio de Android: 1.1.
- Compartir imágenes o archivos: solo texto y enlaces.
- "Compartir" en iOS: la extensión queda apagada (`disableIOS`) mientras
  la publicación es solo Android. Encenderla pide un target de extensión
  y credenciales propias en EAS.
