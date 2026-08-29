# Pantalla de Ajustes — Requirements

Estado: implementado.

## Contexto

`temas/` e `i18n/` dejaron el selector manual explícitamente fuera de
alcance ("requiere una pantalla de ajustes que no existe todavía"). El
usuario pidió esa pantalla el mismo día ("¿Y el apartado de opciones
para esto?"). Este spec es esa pantalla — el contrato de
comportamiento del selector en sí (tema, idioma, persistencia) vive en
`temas/requirements.md` e `i18n/requirements.md`; este spec cubre solo
que exista un lugar donde ejercerlo.

## Requisitos (EARS)

- El sistema DEBERÁ exponer un tab "Ajustes" (5º tab, después de
  Overtime) con acceso directo al selector de tema y de idioma.
- El sistema NO DEBERÁ requerir navegar fuera de los tabs (a un modal
  o pantalla separada) para cambiar tema/idioma — accesible en un tap
  desde cualquier parte de la app.
- Cada selector DEBERÁ mostrar visualmente cuál opción está activa
  (no solo permitir elegir, sin feedback de qué está seleccionado).

## Fuera de este spec

- Cualquier otra opción de ajustes (cuenta, servidor de sync, etc.) —
  no existen todavía en el ecosistema mobile.
- El comportamiento de qué hace cada opción (eso es
  `temas/requirements.md` / `i18n/requirements.md`).
