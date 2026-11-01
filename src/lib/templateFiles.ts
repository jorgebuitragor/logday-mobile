import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

import { sanitizeFilename, shareBinaryFile } from './exportFile';
import { customOvertimeTemplatePath } from './templates/choice';
import { logdayOvertimeTemplate } from './templates/logdayOvertimeXlsx';

// El .xlsx propio del Excel de horas extra (logday-server specs/plantillas,
// v1) vive en `documentDirectory`, no en caché: el sistema puede vaciar la
// caché y la plantilla tiene que seguir ahí. Solo en este teléfono.

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function customTemplateFile(): File {
  return new File(customOvertimeTemplatePath(Paths.document.uri.replace(/\/+$/, '')));
}

/** Los bytes del .xlsx cargado. Falla si no está. */
export async function readCustomOvertimeTemplate(): Promise<Uint8Array> {
  return customTemplateFile().bytes();
}

/** Abre el selector de archivos y copia el .xlsx elegido a la carpeta de la
 *  app. Sin validarlo (v1): si no sirve, el error sale al exportar. Devuelve
 *  el nombre original, o `null` si el usuario canceló. */
export async function pickCustomOvertimeTemplate(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [XLSX_MIME, 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const bytes = await new File(asset.uri).bytes();
  const dest = customTemplateFile();
  dest.create({ intermediates: true, overwrite: true });
  dest.write(bytes);
  return asset.name;
}

/** Comparte una copia de la plantilla de Logday o de la cargada, con la hoja
 *  de compartir del sistema, igual que la exportación. */
export async function shareOvertimeTemplate(which: 'logday' | 'custom', fileName?: string): Promise<void> {
  if (which === 'logday') {
    await shareBinaryFile('Plantilla horas extra (Logday).xlsx', logdayOvertimeTemplate(), XLSX_MIME);
    return;
  }
  const base = sanitizeFilename((fileName ?? '').replace(/\.xlsx$/i, '') || 'Plantilla horas extra');
  await shareBinaryFile(`${base}.xlsx`, await readCustomOvertimeTemplate(), XLSX_MIME);
}
