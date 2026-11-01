import { sanitizeFilename, shareBinaryFile } from './exportFile';
import { generateOvertimeXlsx } from './overtimeExcel';
import { readCustomOvertimeTemplate, XLSX_MIME } from './templateFiles';
import type { OvertimeTemplateChoice } from './templates/choice';
import { logdayOvertimeTemplate } from './templates/logdayOvertimeXlsx';
import { fillOvertimeTemplate } from './templates/overtimeTemplate';
import type { OvertimeEntry, OvertimeMonthMeta } from '../types/overtime';

/** La plantilla elegida no se pudo usar (archivo que falta o que no es un
 *  .xlsx que el motor entienda). La pantalla avisa y no comparte nada. */
export class OvertimeTemplateError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'OvertimeTemplateError';
  }
}

// Único formato — desktop tampoco ofrece otro para Overtime (Excel
// con estilos/fórmulas, ver `overtimeExcel.ts`), así que no hace
// falta un submenú de formato como en Notes/Dailys.
export async function exportOvertimeMonth(
  yearMonth: string,
  mesLabel: string,
  entries: OvertimeEntry[],
  meta: OvertimeMonthMeta | null,
  template?: OvertimeTemplateChoice
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

  // Legacy (o sin elegir) sale del código de siempre; la de Logday y la
  // propia, del motor de plantillas (logday-server specs/plantillas).
  const source = template?.source ?? 'legacy';
  if (source === 'legacy') {
    const bytes = await generateOvertimeXlsx(sorted, metaForExport, mesLabel);
    const filename = `${sanitizeFilename(`Reporte Extras ${colaborador} - ${mesLabel}`)}.xlsx`;
    await shareBinaryFile(filename, bytes, XLSX_MIME);
    return;
  }

  let bytes: Uint8Array;
  try {
    const base = source === 'logday' ? logdayOvertimeTemplate() : await readCustomOvertimeTemplate();
    bytes = fillOvertimeTemplate(base, {
      mes: mesLabel,
      colaborador: metaForExport.colaborador,
      cedula: metaForExport.cedula,
      entries: sorted,
    });
  } catch (err) {
    throw new OvertimeTemplateError(err);
  }
  const filename = `${sanitizeFilename(`Horas extra ${colaborador} - ${mesLabel}`)}.xlsx`;
  await shareBinaryFile(filename, bytes, XLSX_MIME);
}
