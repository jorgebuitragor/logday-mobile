// Esquema local (SQLite en el dispositivo), MVP: Task, Note, DailyEntry,
// OvertimeEntry. Sin `user_id`/`seq` (bookkeeping de servidor, no aplica
// a un dispositivo local todavía sin cliente de sync — ver
// specs/arquitectura-inicial/design.md). `updated_at`/`deleted_at` se
// mantienen desde ya para que el mapeo a logday-server no requiera
// migrar el esquema cuando se implemente el sync real.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  task_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in-progress', 'done')),
  tags TEXT NOT NULL DEFAULT '[]',
  project TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL,
  completed_at TEXT,
  due TEXT,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_entries (
  date TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS overtime_entries (
  id TEXT PRIMARY KEY NOT NULL,
  fecha TEXT NOT NULL,
  solicitada_por TEXT NOT NULL DEFAULT '',
  actividad TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  hora_inicio TEXT NOT NULL,
  hora_final TEXT NOT NULL,
  total_horas REAL NOT NULL DEFAULT 0,
  extras_diurnas REAL NOT NULL DEFAULT 0,
  extras_nocturnas REAL NOT NULL DEFAULT 0,
  extras_diurnas_festivas REAL NOT NULL DEFAULT 0,
  extras_nocturnas_festivas REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS overtime_month_meta (
  year_month TEXT PRIMARY KEY NOT NULL,
  colaborador TEXT NOT NULL DEFAULT '',
  cedula TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Agregado 2026-08-30 — mismos campos que 'absence_days' en
-- logday-server (internal/db/migrations/00010_create_absence_days.sql),
-- sin 'user_id'/'seq' por el mismo motivo que el resto de este
-- esquema (bookkeeping de servidor, no aplica a un dispositivo local
-- sin cliente de sync todavía). 'type' sin CHECK acá — la restricción
-- vive solo en la UI, mismo criterio que 'observaciones' de overtime
-- (ver pantalla-overtime/design.md).
CREATE TABLE IF NOT EXISTS absence_days (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;
