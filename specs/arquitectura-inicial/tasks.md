# Arquitectura inicial — Tareas

Estado: en progreso. Decisiones de stack tomadas y scaffold verificado
en vivo 2026-08-29; faltan los specs de seguimiento (esquema de datos,
navegación).

- [x] Decidir Expo vs React Native bare. **Expo.**
      Satisface: "Stack: React Native" en `design.md`.
- [x] Decidir estructura de repo: standalone vs monorepo con
      `task-manager`. **Standalone.**
      Satisface: "Estructura de repo" en `design.md`.
- [x] Decidir motor de almacenamiento local. **SQLite embebido**
      (`expo-sqlite`).
      Satisface: "Almacenamiento local" en `design.md`.
- [x] Decidir alcance del MVP: **Task, Note, dailys, OvertimeEntry**;
      `CalendarEvent`/`AbsenceDay` a fase posterior.
      Satisface: "Paridad funcional con el resto del ecosistema" en
      `requirements.md`.
- [x] Confirmar con el usuario si el cliente de sync real se implementa
      ya o se espera a `task-manager`. **Se espera** a que desktop
      quede validado end-to-end (respeta el orden de integración de
      `logday-server`).
      Satisface: nota de "Contexto"/"Orden de integración" en
      `requirements.md`.
- [x] Scaffold inicial del proyecto: Expo + TypeScript (`create-expo-app`,
      template `blank-typescript`), `expo-sqlite` instalado (versión
      resuelta automáticamente vía `npx expo install`, agregó el plugin
      en `app.json`), esquema local mínimo en `src/db/schema.ts`
      (`tasks`, `notes`, `daily_entries`, `overtime_entries`,
      `overtime_month_meta`) + `src/db/index.ts` (`openDatabaseSync` +
      `execAsync` para crear las tablas al iniciar) y tipos TS en
      `src/types/`. `App.tsx` llama `initDb()` y muestra el resultado en
      pantalla como smoke test. `npx tsc --noEmit` pasa sin errores.
      **Verificación en simulador iOS abortada**: se intentó levantar en
      el simulador de iOS (`iPhone 17 Pro`) vía `npx expo start --ios`,
      pero el paso "Installing Expo Go on iPhone 17 Pro" se quedó
      colgado varios minutos sin avanzar (probablemente por falta de
      aceleración de virtualización en este entorno en sandbox) — se
      abortó el intento en vez de esperar indefinidamente.
      **SDK: se probó bajar a 54/56, pero quedó fijo en 57 (decisión
      explícita del usuario)**. El scaffold inicial quedó en Expo SDK 57
      (`latest` en npm), incompatible con la Expo Go de Play Store del
      usuario ("Project is incompatible with this version of Expo Go").
      Se probó bajar a SDK 56 (mismo error) y luego a **SDK 54**, que sí
      coincidió con lo que la Expo Go real reportaba en Settings → App
      Info (`Client version 54.0.8` / `Supported SDK 54`) y conectó sin
      error. Investigado el motivo: no es que la Expo Go del usuario
      esté desactualizada — **Expo Go en las app stores está
      congelado en SDK 54 a nivel global**, porque SDK 55 lleva meses
      atascado en la cola de aprobación de Apple (ver
      [changelog oficial de Expo, mayo 2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026)).
      Con ese contexto, el usuario decidió explícitamente **quedarse en
      SDK 57** ("déjala en 57, yo resuelvo lo de Expo Go" — resolverá la
      compatibilidad por su cuenta, ej. development build/EAS en vez de
      la Expo Go de la store). Deps finales: `expo@^57.0.0`,
      `react-native@0.86.3`, `expo-sqlite@~57.0.2`,
      `expo-status-bar@~57.0.1`, `react@19.2.3`. `npx tsc --noEmit`
      pasa sin errores. Dev server corriendo (`curl localhost:8081/status`
      → `running`) vía LAN (`exp://192.168.20.121:8081`).
      **No volver a bajar el SDK automáticamente** si vuelve a aparecer
      el error de incompatibilidad — es una decisión ya tomada por el
      usuario, preguntarle primero.
      Nota aparte: Node instalado es v20.11.0, por debajo de lo que
      piden algunos paquetes de Expo/RN (`>=20.19.4`) — funciona igual
      (solo warnings), pero conviene actualizar Node en algún momento.
      **Verificado en vivo (2026-08-29)**: el usuario resolvió la
      compatibilidad de Expo Go por su cuenta y conectó desde su
      Android real contra `exp://192.168.20.121:8081`. La app carga:
      pantalla con "Logday Mobile" y "DB lista" — confirma que
      `initDb()` corre sin error y `expo-sqlite` inicializa
      correctamente en runtime, no solo en `tsc --noEmit`.
- [ ] Definir esquema de datos local (tablas SQLite) — probablemente su
      propio spec (`esquema-datos/`), espejo del que ya existe en
      `logday-server`.
- [ ] Definir esquema de pantallas/navegación — probablemente su propio
      spec.
