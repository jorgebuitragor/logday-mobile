# Papelera — Requirements

Estado: implementado (pendiente confirmación en vivo). Sin cambios en
logday-server ni en el contrato de sync.

## Contexto

Parte de las funciones nuevas de la 1.0 (vault: "Funciones nuevas de
Mobile 1.0 (plan)"). Mobile ya borraba en blando: cada tabla tiene
`deleted_at` y la fila queda en SQLite, también cuando el borrado llega
de otro cliente por el pull. Desktop y Web ya tienen papelera; esta
sigue la de Web, que también vive en Ajustes.

## Requisitos (EARS)

- La papelera DEBERÁ mostrar lo borrado de tareas, notas, dailys, horas
  extra y ausencias, en este teléfono o en otro cliente, de lo más
  reciente a lo más viejo.
- Una nota que se descartó vacía al salir del editor y un daily sin
  texto NO DEBERÁN aparecer.
- Cuando el usuario borre algo, el sistema DEBERÁ mostrar unos segundos
  un aviso "Eliminado · Deshacer" que lo restaura. El aviso DEBERÁ
  seguir visible aunque la pantalla que borró se cierre.
- Al restaurar, el sistema DEBERÁ revivir el elemento aquí y en el
  servidor, sin duplicar el texto de notas ni dailys y sin perder lo
  escrito sin conexión antes del borrado.
- Si el borrado todavía no salió hacia el servidor, el sistema DEBERÁ
  cancelarlo al restaurar, para que no vuelva a borrar lo restaurado.
- Una ausencia NO DEBERÁ restaurarse si ese día ya tiene otra activa
  (una por fecha); el sistema DEBERÁ decirlo y dejarla en la papelera.
- "Eliminar para siempre" y "Vaciar" DEBERÁN pedir confirmación siempre
  y borrar solo la copia de este teléfono. En el servidor el registro
  sigue como borrado, igual que en Desktop y Web (no hay endpoint de
  borrado definitivo).
- El sistema DEBERÁ purgar al abrir la app lo que lleva más de 60 días
  en la papelera, con un interruptor encendido por omisión. El
  interruptor es de cada teléfono: no se sincroniza.
- La respuesta tardía de una escritura NO DEBERÁ revivir algo que el
  usuario borró mientras viajaba.

## Fuera de este spec

- Borrado definitivo en el servidor y una papelera compartida entre
  clientes: siguen abiertos en logday-server.
- `OvertimeMonthMeta`: no se borra desde la app.
