export interface OvertimeEntry {
  id: string;
  fecha: string;
  solicitadaPor: string;
  actividad: string;
  observaciones: string;
  horaInicio: string;
  horaFinal: string;
  totalHoras: number;
  extrasDiurnas: number;
  extrasNocturnas: number;
  extrasDiurnasFestivas: number;
  extrasNocturnasFestivas: number;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OvertimeMonthMeta {
  yearMonth: string;
  colaborador: string;
  cedula: string;
  updatedAt: string;
  deletedAt: string | null;
}
