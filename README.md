# Logday Mobile

App de Logday para Android e iOS: tareas, notas, dailys (registro diario de actividades), ausencias y horas extra.

Como [Logday Desktop](https://github.com/jorgebuitragor/logday), es local-first: todo vive en una base SQLite del teléfono y la app funciona completa sin servidor. El sync con [`logday-server`](https://github.com/jorgebuitragor/logday-server) es opcional. Sirve para tener los mismos datos que en Desktop y [Logday Web](https://github.com/jorgebuitragor/logday-web).

Está hecha con Expo SDK 57 (managed) + React Native 0.86 + TypeScript y Expo Router. Usa `expo-sqlite` para los datos, `expo-secure-store` para los tokens del sync y Yjs para el texto de notas y dailys.

## Qué incluye

- **Tareas:** lista, Kanban (arrastrar con el dedo) y calendario. Incluye proyectos, estados, vencimiento, tags y progreso opcional (0–100).
- **Notas:** carpetas, tags, notas destacadas, vista de lista o cuadrícula, editor con barra de Markdown y menú contextual desde la lista.
- **Dailys:** un registro por día, agrupado por mes.
- **Ausencias** con los festivos de Colombia.
- **Horas extra:** registro mensual, cálculo de las franjas de extras, vista previa y exportación.
- **Búsqueda global**, acciones al deslizar las filas y confirmación antes de borrar.
- **Exportar y compartir** notas, dailys y horas extra.
- **Ajustes:** 8 temas, idioma español o inglés y conexión con el servidor.

### Estado del sync

Las tareas, ausencias, horas extra, notas y dailys ya se sincronizan, probado contra un servidor real. Cada campo se resuelve por separado, y el texto de notas y dailys se fusiona con CRDT. Falta la última fase: subir al servidor los datos que ya estaban en el teléfono antes de conectarlo. Detalle en [`specs/sync-mobile/`](./specs/sync-mobile/requirements.md).

## Desarrollo

Requisitos: Node.js 22 (el de la CI) y la app Expo Go en el teléfono, en la misma red que el computador.

```bash
npm install
npm start          # abre Expo; escanea el QR con Expo Go
```

Para probar el sync, el servidor tiene que ser alcanzable desde el teléfono: usa la IP del computador en la red (por ejemplo `http://192.168.1.10:8080`), no `localhost`.

No hay pruebas automáticas. Cada cambio se revisa con:

```bash
npm run typecheck
npm run lint
```

Después hay que pedir el bundle de Metro y comprobar que las claves de i18n en español y en inglés sean las mismas. El paso a paso está en [`AGENTS.md`](./AGENTS.md).

## Documentación

- [`specs/`](./specs/README.md): una carpeta por feature con requisitos, diseño y tareas (Spec-Driven Development), con su estado en el índice. Varias features están implementadas pero falta confirmarlas en un teléfono.
- [`AGENTS.md`](./AGENTS.md): comandos, verificación, convenciones de fechas y lo que no se hace sin preguntar. Sirve para personas y para agentes de IA.
- El contrato de sync es el de `logday-server` ([`openapi.yaml`](https://github.com/jorgebuitragor/logday-server/blob/develop/openapi.yaml)).

Ramas: `feature/<slug>` desde `develop`, con PR a `develop`; `main` solo recibe releases.

## Licencia

[AGPL-3.0-or-later](./LICENSE).
