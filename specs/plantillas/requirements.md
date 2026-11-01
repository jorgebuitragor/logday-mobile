# Plantillas — Requirements

Estado: implementado (v1, pendiente confirmación en vivo).

## Contexto

El mensaje del Daily ("Copiar" en el editor del día) y el Excel de horas
extra tenían un único formato fijo en el código. La v1 de plantillas deja
elegir, para cada salida, qué formato usar. El contrato del ecosistema está
en `../logday-server/specs/plantillas/`; manda su sección "Alcance de la
v1": se guarda solo en el teléfono, sin sync, sin cambios en el servidor y
sin validar el `.xlsx` al cargarlo.

## Requisitos (EARS)

### Mensaje del Daily

- El sistema DEBERÁ ofrecer dos plantillas para el mensaje del Daily:
  **Logday** (predeterminada) y **Propia**.
- Mientras esté elegida la de Logday, o no haya ninguna elegida, el sistema
  DEBERÁ copiar y previsualizar exactamente el mismo texto que antes de este
  cambio (`buildDailyCopyText` de `src/lib/dailyCopyText.ts`).
- Mientras esté elegida la propia, el sistema DEBERÁ armar el mensaje con
  su texto, reemplazando los marcadores `{{anterior.fecha}}`,
  `{{anterior.actividades}}`, `{{hoy.fecha}}`, `{{hoy.actividades}}` y
  `{{usuario.nombre}}`, y las secciones `{{#hoy.es_hoy}}…{{/hoy.es_hoy}}`
  y `{{^hoy.es_hoy}}…{{/hoy.es_hoy}}`.
- `{{usuario.nombre}}` DEBERÁ ser el colaborador de la meta de horas extra
  del mes del Daily o, si ese mes no lo tiene, el del último mes que lo
  tenga; vacío si nunca se llenó.
- Cuando la propia esté vacía, el sistema DEBERÁ usar la de Logday.
- Cuando se pase a la propia por primera vez (sin texto guardado), el
  sistema DEBERÁ arrancarla con la de Logday escrita como plantilla.

### Excel de horas extra

- El sistema DEBERÁ ofrecer tres plantillas para el Excel: **Legacy**
  (predeterminada), **Logday** y **Propia**.
- Mientras esté elegida Legacy, o ninguna, el sistema DEBERÁ exportar el
  mismo Excel que antes de este cambio (`generateOvertimeXlsx`).
- Mientras esté elegida la de Logday o la propia, el sistema DEBERÁ llenar
  esa plantilla con el mes (el mismo texto que usa Legacy), el colaborador,
  la cédula y los registros del mes, y compartirla con la hoja de
  compartir del sistema, como la exportación de siempre.
- La propia NO DEBERÁ poder elegirse mientras no haya un `.xlsx` cargado.
- El sistema NO DEBERÁ validar el `.xlsx` al cargarlo. Cuando no se pueda
  usar al exportar, DEBERÁ avisar "No se pudo usar la plantilla" con la
  indicación de revisarla en Ajustes → Plantillas o volver a Legacy, y no
  compartir nada.

### Pantalla de Plantillas

- Ajustes DEBERÁ tener una entrada "Plantillas" que abre la pantalla.
- La sección del Daily DEBERÁ mostrar el selector, y con la propia: el
  campo de texto multilínea, botones para insertar cada marcador en el
  cursor, "Empezar con la de Logday" y los avisos de propia vacía, de
  marcador desconocido y de sección sin cerrar. Debajo, una vista previa
  con datos de ejemplo.
- La sección del Excel DEBERÁ mostrar el selector, el archivo cargado (nombre
  y fecha de carga), "Cargar plantilla (.xlsx)" / "Cargar otra",
  "Compartir la cargada", "Compartir la de Logday" y una ayuda plegable con
  los marcadores.

### Persistencia

- La elección DEBERÁ guardarse en AsyncStorage (clave `templates`), solo en
  este teléfono. Sin nada guardado, `{}`: Logday en el Daily y Legacy en el
  Excel.
- El `.xlsx` propio DEBERÁ guardarse en `documentDirectory`
  (`plantillas/horas-extra.xlsx`), con su nombre original y la fecha de
  carga en `templates.overtime`.

## Fuera de este spec (v1)

- Sync de la elección o de la plantilla propia, y cualquier cambio en el
  servidor.
- Validar el `.xlsx` al cargarlo.
