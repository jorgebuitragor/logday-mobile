# Flujos de Maestro

Pruebas de punta a punta de Logday Mobile con [Maestro](https://maestro.dev):
tocan la app instalada en un emulador o teléfono como lo haría una persona.

| Flujo | Qué comprueba |
|---|---|
| `01-inicio.yaml` | La app arranca sin datos; Inicio muestra la bienvenida y sus secciones; una nota nueva aparece en "Notas recientes" y sigue ahí al cerrar y volver a abrir la app. |
| `02-tarea.yaml` | Crear una tarea desde Inicio, verla en Tareas, editar el título y el estado. |
| `03-nota.yaml` | Crear una nota con título y contenido, verla en Notas, editar el contenido y comprobarlo al reabrirla. |
| `04-daily.yaml` | Empezar el daily de hoy desde Inicio, agregar una actividad, editarla y verla en Inicio y en Dailys. |
| `05-papelera.yaml` | Borrar una tarea, encontrarla en Ajustes → Papelera, restaurarla y verla de nuevo en Tareas. |

Cada flujo empieza con `comunes/abrir-limpia.yaml`: **borra los datos de la
app** (`clearState`) y la pone en español desde Ajustes, para que los textos
no dependan del idioma del teléfono. No se corren contra un servidor: todo es
local, sin sync.

## Cómo correrlos

Necesitas Maestro (`brew install maestro`, o `curl -Ls "https://get.maestro.mobile.dev" | bash`)
y un emulador o teléfono Android conectado (`adb devices`) con la app
`dev.logday.app` instalada, por ejemplo un APK del perfil `preview` de EAS:

```bash
adb install -r logday.apk
```

Todos, en orden:

```bash
npm run e2e
```

Uno solo:

```bash
maestro test .maestro/02-tarea.yaml
```

**Ojo:** borran los datos de `dev.logday.app` en el dispositivo. No los corras
en un teléfono donde uses la app de verdad.

## Notas para escribir flujos

- **Selectores:** la app no tiene `testID`, así que los flujos buscan por el texto en español (`src/i18n/locales/es.json`). Si cambias un texto que usa un flujo, cambia también el flujo.
- **Escribir:** usa `comunes/escribir.yaml` para un campo vacío y `comunes/reemplazar.yaml` para cambiar un texto corto (borra 25 caracteres). Los dos esperan al teclado: en el emulador, escribir apenas aparece duplica las primeras letras. Evita borrar mucho con `eraseText`: va tecla por tecla y, en una corrida larga, el driver de Maestro en el emulador se cayó a mitad de un borrado de 60.
- **Acentos y eñes:** `inputText` no los escribe en Android (sale de `adb shell input text`). Los textos que se escriben van sin tildes; los que se leen sí pueden llevarlas.
- **`hideKeyboard`:** solo con el teclado abierto. En Android, si ya está cerrado, equivale a "atrás" y saca de la pantalla.
- **Volver:** el botón atrás del encabezado es `Navigate up` (o `Navegar hacia arriba` si el teléfono está en español). Ajustes se abre desde el ícono de Inicio.
- **Probado** el 13 nov 2026: los 5 pasan en unos 10 minutos (`npm run e2e`) en el AVD `Logday_Pixel` (Pixel 8, Android 16) con el build preview 6 (código de `develop` `82831c7`) y Maestro 2.10.0.
