// Puerto de `task-manager/src/types/absence.ts` — mismos 3 valores de
// tipo que ya valida el servidor (`internal/absence/models.go`,
// `validTypes`), ver specs/ausencias/.
export type AbsenceType = 'incapacidad' | 'vacaciones' | 'otro';

export interface AbsenceDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: AbsenceType;
  note: string | null;
  updatedAt: string;
  deletedAt: string | null;
}
