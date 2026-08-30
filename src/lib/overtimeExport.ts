import { sanitizeFilename, shareBinaryFile } from './exportFile';
import { generateOvertimeXlsx } from './overtimeExcel';
import type { OvertimeEntry, OvertimeMonthMeta } from '../types/overtime';

// Único formato — desktop tampoco ofrece otro para Overtime (Excel
// con estilos/fórmulas, ver `overtimeExcel.ts`), así que no hace
// falta un submenú de formato como en Notes/Dailys.
export async function exportOvertimeMonth(
  yearMonth: string,
  mesLabel: string,
  entries: OvertimeEntry[],
  meta: OvertimeMonthMeta | null
): Promise<void> {
  // Mismo fallback que desktop (`appStore.ts`, `exportOvertimeExcel`):
  // "Colaborador" si no hay meta o está vacío — mobile no tiene UI
  // propia para editar colaborador/cedula todavía, ver db/overtime.ts.
  const metaForExport: OvertimeMonthMeta = meta ?? {
    yearMonth,
    colaborador: '',
    cedula: '',
    updatedAt: '',
    deletedAt: null,
  };
  const colaborador = metaForExport.colaborador || 'Colaborador';

  // Orden cronológico ascendente para el reporte — mismo criterio que
  // Dailys (ver dailyMonthExport.ts); `listOvertimeEntries` trae todo
  // en orden descendente para el listado.
  const sorted = [...entries].sort((a, b) =>
    a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha)
  );

  const bytes = await generateOvertimeXlsx(sorted, metaForExport, mesLabel);
  const filename = `${sanitizeFilename(`Reporte Extras ${colaborador} - ${mesLabel}`)}.xlsx`;
  await shareBinaryFile(filename, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
