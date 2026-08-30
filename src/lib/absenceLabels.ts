import type { AbsenceType } from '../types/absence';

// Puerto de `absenceTypeLabel` de desktop — mismo criterio que
// `observacionesLabel` de overtime (helper compartido en vez de
// duplicar el switch en cada consumidor).
export function absenceTypeLabel(t: (key: string) => string, type: AbsenceType): string {
  if (type === 'incapacidad') return t('absence.typeIncapacidad');
  if (type === 'vacaciones') return t('absence.typeVacaciones');
  return t('absence.typeOtro');
}
