import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Desktop exporta con un diálogo nativo de guardado (Tauri) — mobile
// no tiene equivalente directo (no hay "guardar en una ruta
// arbitraria" sin un document picker). Se usa el patrón estándar de
// apps móviles en su lugar: escribir un archivo temporal en el
// directorio de caché y abrir la hoja de compartir del sistema
// (`expo-sharing`), que deja al usuario decidir destino (Drive,
// archivos, otra app) — ver specs/exportacion/design.md.

export function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 80) || 'sin-titulo';
}

export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

export async function sharePdfFile(uri: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
}
