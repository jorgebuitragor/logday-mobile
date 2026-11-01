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
  DEBERÁ copiar y previsualizar el mensaje de siempre
  (`buildDailyCopyText` de `src/lib/dailyCopyText.ts`, igual al de
  Desktop, ver `pantalla-dailys/`).
- Mientras esté elegida la propia, el sistema DEBERÁ armar el mensaje con
  su texto, reemplazando los marcadores `{{anterior.fecha}}`,
  `{{anterior.actividades}}`, `{{hoy.dia}}` ("de hoy, Lunes 2 de
  Noviembre" si el Daily es de hoy, "Lunes 2 de Noviembre" si no),
  `{{hoy.fecha}}`, `{{hoy.actividades}}` y `{{usuario.nombre}}`. Las
  secciones `{{#hoy.es_hoy}}…{{/hoy.es_hoy}}` siguen funcionando, pero no
  se ofrecen.
- `{{usuario.nombre}}` DEBERÁ ser el colaborador de la meta de horas extra
  del mes del Daily o, si ese mes no lo tiene, el del último mes que lo
  tenga; vacío si nunca se llenó.
- Cuando la propia esté vacía, el sistema DEBERÁ usar la de Logday.
- Cuando se pase a la propia por primera vez (sin texto guardado), el
  sistema DEBERÁ arrancarla con la de Logday escrita como plantilla
  (`LOGDAY_DAILY_TEMPLATE`), que da el mismo texto que la de Logday.

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
- La sección del Daily DEBERÁ mostrar el selector, y con la propia:
  - "Ejemplos para empezar": "El de siempre", "Corto" y "Con tu nombre"
    (`DAILY_TEMPLATE_EXAMPLES`), que reemplazan el texto.
  - El campo de texto multilínea, donde cada marcador NO DEBERÁ verse como
    `{{clave}}` sino como un recuadro de color con su nombre (día anterior
    en ámbar, el Daily en índigo, el usuario en verde azulado). Por dentro
    se guarda `{{clave}}`.
  - Un botón por marcador, con el mismo recuadro y un ejemplo del valor
    debajo, que lo agrega donde está el cursor.
  - Los avisos de propia vacía, de marcador desconocido (incluido un
    recuadro editado por dentro) y de sección sin cerrar.
  Debajo, una vista previa con datos de ejemplo.
- La sección del Excel DEBERÁ mostrar el selector, el archivo cargado (nombre
  y fecha de carga), "Cargar plantilla (.xlsx)" / "Cargar otra",
  "Compartir la cargada", "Compartir la de Logday" y una ayuda plegable con
  una tabla de los marcadores: "Escribe en la celda" (`{{colaborador}}`),
  "Qué pone Logday" ("Tu nombre") y "Ejemplo" ("Ana Gómez"), los de fila en
  índigo y los demás en ámbar.

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
