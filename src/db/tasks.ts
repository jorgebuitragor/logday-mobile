import { randomUUID } from 'expo-crypto';

import type { Task, TaskStatus } from '../types/task';
import { getDb } from './index';

interface TaskRow {
  id: string;
  title: string;
  task_code: string | null;
  status: TaskStatus;
  tags: string;
  project: string;
  created: string;
  completed_at: string | null;
  due: string | null;
  content: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    taskCode: row.task_code,
    status: row.status,
    tags: JSON.parse(row.tags) as string[],
    project: row.project,
    created: row.created,
    completedAt: row.completed_at,
    due: row.due,
    content: row.content,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const rows = await getDb().getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created DESC'
  );
  return rows.map(rowToTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const row = await getDb().getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? rowToTask(row) : null;
}

export interface TaskInput {
  title: string;
  status: TaskStatus;
  due: string | null;
  content: string;
}

export async function createTask(input: TaskInput): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await getDb().runAsync(
    `INSERT INTO tasks (id, title, task_code, status, tags, project, created, completed_at, due, content, updated_at, deleted_at)
     VALUES (?, ?, NULL, ?, '[]', '', ?, NULL, ?, ?, ?, NULL)`,
    id,
    input.title,
    input.status,
    now,
    input.due,
    input.content,
    now
  );
  return id;
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    `UPDATE tasks SET title = ?, status = ?, due = ?, content = ?, updated_at = ? WHERE id = ?`,
    input.title,
    input.status,
    input.due,
    input.content,
    now,
    id
  );
}

export async function softDeleteTask(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE tasks SET deleted_at = ? WHERE id = ?', now, id);
}
