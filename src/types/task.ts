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
  content: string;
  updatedAt: string;
  deletedAt: string | null;
}
