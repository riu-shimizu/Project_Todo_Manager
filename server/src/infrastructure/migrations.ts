import db from './db';

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      ownerId TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (projectId, userId),
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      plannedStart TEXT NOT NULL,
      plannedEnd TEXT NOT NULL,
      actualStart TEXT,
      actualEnd TEXT,
      memo TEXT,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      phaseId TEXT NOT NULL,
      title TEXT NOT NULL,
      plannedStart TEXT NOT NULL,
      plannedEnd TEXT NOT NULL,
      actualStart TEXT,
      actualEnd TEXT,
      memo TEXT,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(phaseId) REFERENCES phases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      workId TEXT NOT NULL,
      title TEXT NOT NULL,
      plannedStart TEXT NOT NULL,
      plannedEnd TEXT NOT NULL,
      actualStart TEXT,
      actualEnd TEXT,
      memo TEXT,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(workId) REFERENCES works(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      taskId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      assigneeId TEXT NOT NULL,
      dueDate TEXT,
      memo TEXT,
      referenceUrl TEXT,
      todayFlag INTEGER NOT NULL DEFAULT 0,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(assigneeId) REFERENCES users(id) ON DELETE SET DEFAULT
    );

    CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(projectId, orderIndex);
    CREATE INDEX IF NOT EXISTS idx_works_phase ON works(phaseId, orderIndex);
    CREATE INDEX IF NOT EXISTS idx_tasks_work ON tasks(workId, orderIndex);
    CREATE INDEX IF NOT EXISTS idx_todos_task ON todos(taskId, orderIndex);
    CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assigneeId);
    CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(dueDate);
  `);

  ensureColumn('phases', 'status');
  ensureColumn('works', 'status');
  ensureColumn('tasks', 'status');
}

function ensureColumn(table: string, column: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (info.some((row) => row.name === column)) {
    return;
  }
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT 'NOT_STARTED'`).run();
}
