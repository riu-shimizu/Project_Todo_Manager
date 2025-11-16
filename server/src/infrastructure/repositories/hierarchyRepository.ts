import { nanoid } from 'nanoid';
import { Phase, Work, Task, Todo, TodoStatus } from '../../domain/entities';
import db from '../db';

type TodoRow = Omit<Todo, 'todayFlag'> & { todayFlag: number };

function getNextOrder(table: string, column: string, value: string) {
  const row = db
    .prepare(`SELECT COALESCE(MAX(orderIndex), -1) AS idx FROM ${table} WHERE ${column} = ?`)
    .get(value) as { idx: number };
  return row.idx + 1;
}

export const hierarchyRepository = {
  listHierarchy(projectId: string) {
    const phases = db
      .prepare('SELECT * FROM phases WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as Phase[];
    const works = db
      .prepare('SELECT * FROM works WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as Work[];
    const tasks = db
      .prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as Task[];
    const todos = (db
      .prepare('SELECT * FROM todos WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as TodoRow[]).map((row) => ({ ...row, todayFlag: Boolean(row.todayFlag) }));
    return { phases, works, tasks, todos };
  },

  listPlanningStatuses(projectId: string) {
    const phases = db
      .prepare('SELECT id, status FROM phases WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as { id: string; status: TodoStatus }[];
    const works = db
      .prepare('SELECT id, phaseId, status FROM works WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as { id: string; phaseId: string; status: TodoStatus }[];
    const tasks = db
      .prepare('SELECT id, workId, status FROM tasks WHERE projectId = ? ORDER BY orderIndex ASC')
      .all(projectId) as { id: string; workId: string; status: TodoStatus }[];

    return { phases, works, tasks };
  },

  createPhase(input: Omit<Phase, 'id' | 'createdAt' | 'orderIndex'>): Phase {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const orderIndex = getNextOrder('phases', 'projectId', input.projectId);
    db.prepare(`
      INSERT INTO phases (id, projectId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
      VALUES (@id, @projectId, @title, @plannedStart, @plannedEnd, @actualStart, @actualEnd, @memo, @orderIndex, @createdAt, @status)
    `).run({
      ...input,
      actualStart: input.actualStart ?? null,
      actualEnd: input.actualEnd ?? null,
      memo: input.memo ?? null,
      id,
      orderIndex,
      createdAt: now,
    });
    return { ...input, id, orderIndex, createdAt: now };
  },

  createWork(input: Omit<Work, 'id' | 'createdAt' | 'orderIndex'>): Work {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const orderIndex = getNextOrder('works', 'phaseId', input.phaseId);
    db.prepare(`
      INSERT INTO works (id, projectId, phaseId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
      VALUES (@id, @projectId, @phaseId, @title, @plannedStart, @plannedEnd, @actualStart, @actualEnd, @memo, @orderIndex, @createdAt, @status)
    `).run({
      ...input,
      actualStart: input.actualStart ?? null,
      actualEnd: input.actualEnd ?? null,
      memo: input.memo ?? null,
      id,
      orderIndex,
      createdAt: now,
    });
    return { ...input, id, orderIndex, createdAt: now };
  },

  createTask(input: Omit<Task, 'id' | 'createdAt' | 'orderIndex'>): Task {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const orderIndex = getNextOrder('tasks', 'workId', input.workId);
    db.prepare(`
      INSERT INTO tasks (id, projectId, workId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
      VALUES (@id, @projectId, @workId, @title, @plannedStart, @plannedEnd, @actualStart, @actualEnd, @memo, @orderIndex, @createdAt, @status)
    `).run({
      ...input,
      actualStart: input.actualStart ?? null,
      actualEnd: input.actualEnd ?? null,
      memo: input.memo ?? null,
      id,
      orderIndex,
      createdAt: now,
    });
    return { ...input, id, orderIndex, createdAt: now };
  },

  createTodo(input: Omit<Todo, 'id' | 'createdAt' | 'orderIndex'>): Todo {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const orderIndex = getNextOrder('todos', 'taskId', input.taskId);
    db.prepare(`
      INSERT INTO todos (id, projectId, taskId, title, status, assigneeId, dueDate, memo, referenceUrl, todayFlag, orderIndex, createdAt)
      VALUES (@id, @projectId, @taskId, @title, @status, @assigneeId, @dueDate, @memo, @referenceUrl, @todayFlag, @orderIndex, @createdAt)
    `).run({
      ...input,
      dueDate: input.dueDate ?? null,
      memo: input.memo ?? null,
      referenceUrl: input.referenceUrl ?? null,
      id,
      orderIndex,
      todayFlag: input.todayFlag ? 1 : 0,
      createdAt: now,
    });
    return { ...input, id, orderIndex, createdAt: now };
  },

  updatePhase(id: string, patch: Partial<Omit<Phase, 'id' | 'projectId' | 'createdAt'>>) {
    this.updateEntity('phases', id, patch);
  },

  updateWork(id: string, patch: Partial<Omit<Work, 'id' | 'projectId' | 'createdAt'>>) {
    this.updateEntity('works', id, patch);
  },

  updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) {
    this.updateEntity('tasks', id, patch);
  },

  updateTodo(id: string, patch: Partial<Omit<Todo, 'id' | 'projectId' | 'createdAt'>>) {
    const payload: Record<string, unknown> = { ...patch };
    if (patch.todayFlag !== undefined) {
      payload.todayFlag = patch.todayFlag ? 1 : 0;
    }
    this.updateEntity('todos', id, payload);
  },

  updateEntity(table: string, id: string, patch: Record<string, unknown>) {
    const entries = Object.entries(patch).filter(([_, value]) => value !== undefined);
    if (entries.length === 0) return;

    const sets = entries.map(([key]) => `${key} = @${key}`);
    const stmt = db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = @id`);
    stmt.run({ ...Object.fromEntries(entries), id });
  },

  reorder(table: 'phases' | 'works' | 'tasks' | 'todos', ids: string[]) {
    const update = db.prepare(`UPDATE ${table} SET orderIndex = @orderIndex WHERE id = @id`);
    const transaction = db.transaction(() => {
      ids.forEach((id, idx) => update.run({ id, orderIndex: idx }));
    });
    transaction();
  },

  listTodayTodos(projectId: string, filter: { assigneeId?: string; status?: TodoStatus }) {
    const where = ['projectId = @projectId'];
    if (filter.assigneeId) {
      where.push('assigneeId = @assigneeId');
    }
    if (filter.status) {
      where.push('status = @status');
    }
    where.push(`(todayFlag = 1 OR dueDate = date('now'))`);
    const stmt = db.prepare(`SELECT * FROM todos WHERE ${where.join(' AND ')} ORDER BY dueDate ASC, orderIndex ASC`);
    const rows = stmt.all({
      projectId,
      assigneeId: filter.assigneeId,
      status: filter.status,
    }) as TodoRow[];
    return rows.map((row) => ({ ...row, todayFlag: Boolean(row.todayFlag) }));
  },

  deletePhase(id: string) {
    const result = db.prepare('DELETE FROM phases WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteWork(id: string) {
    const result = db.prepare('DELETE FROM works WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteTask(id: string) {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteTodo(id: string) {
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
