// Extraído al necesitarse el mismo criterio en 2 lugares:
// `app/(tabs)/overtime.tsx` (badge en cada fila) y
// `OvertimePreviewModal.tsx` (misma info en cada tarjeta). Mismo
// criterio que desktop (`OvertimeList.tsx`/`OvertimePreviewModal.tsx`,
// `COMP_KEYS`): `observaciones` guarda una de 3 claves fijas
// ('comp'/'pay'/'other', mismas que el radio del formulario) o texto
// libre — si es una clave conocida se traduce, si no se muestra tal
// cual.
export function observacionesLabel(t: (key: string) => string, value: string): string {
  if (value === 'comp') return t('overtimeForm.comp');
  if (value === 'pay') return t('overtimeForm.pay');
  if (value === 'other') return t('overtimeForm.other');
  return value;
}
