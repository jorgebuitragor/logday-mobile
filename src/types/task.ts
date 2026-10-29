export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  taskCode: string | null;
  status: TaskStatus;
  tags: string[];
  project: string;
  created: string;
  completedAt: string | null;
  due: string | null;
  /** Entero 0–100, o `null` = sin progreso (`null` no es `0`). Ver
   *  `src/lib/taskProgress.ts`. */
  progress: number | null;
  content: string;
  updatedAt: string;
  deletedAt: string | null;
}
