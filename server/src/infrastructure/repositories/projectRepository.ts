import { nanoid } from 'nanoid';
import { Project } from '../../domain/entities';
import { deriveStatusFromActual } from '../../domain/status';
import db from '../db';

interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: string;
}

function countCompleted(items: { actualStart?: string | null; actualEnd?: string | null }[]) {
  return items.reduce(
    (acc, item) => {
      if (deriveStatusFromActual(item.actualStart, item.actualEnd) === 'DONE') {
        acc.done += 1;
      }
      acc.total += 1;
      return acc;
    },
    { done: 0, total: 0 },
  );
}

export const projectRepository = {
  create(input: CreateProjectInput): Project {
    const id = nanoid(12);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO projects (id, name, description, ownerId, archived, createdAt)
       VALUES (@id, @name, @description, @ownerId, 0, @createdAt)`
    ).run({
      id,
      name: input.name,
      description: input.description ?? null,
      ownerId: input.ownerId,
      createdAt: now,
    });

    return {
      id,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      archived: false,
      createdAt: now,
    };
  },

  list(): Project[] {
    const rows = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
    return rows as Project[];
  },

  findById(id: string): Project | undefined {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row as Project | undefined;
  },

  update(id: string, patch: { name?: string; description?: string }): Project | undefined {
    const current = this.findById(id);
    if (!current) return undefined;

    const next: Project = {
      ...current,
      ...patch,
    };

    db.prepare(
      `UPDATE projects SET name = @name, description = @description WHERE id = @id`,
    ).run({
      id,
      name: next.name,
      description: next.description ?? null,
    });

    return next;
  },

  addMember(projectId: string, userId: string, role: 'OWNER' | 'MEMBER') {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO project_members (projectId, userId, role, createdAt)
       VALUES (?, ?, ?, ?)`
    ).run(projectId, userId, role, now);
  },

  getTodoStats(projectId: string) {
    const res = db.prepare(
      `SELECT
          SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) AS done,
          COUNT(t.id) AS total
        FROM todos t
        WHERE t.projectId = ?`
    ).get(projectId) as { done: number | null; total: number | null };

    return {
      done: res.done ?? 0,
      total: res.total ?? 0,
    };
  },

  getPlanningStats(projectId: string) {
    const phases = db
      .prepare('SELECT actualStart, actualEnd FROM phases WHERE projectId = ?')
      .all(projectId) as { actualStart?: string | null; actualEnd?: string | null }[];

    const works = db
      .prepare('SELECT actualStart, actualEnd FROM works WHERE projectId = ?')
      .all(projectId) as { actualStart?: string | null; actualEnd?: string | null }[];

    const tasks = db
      .prepare('SELECT actualStart, actualEnd FROM tasks WHERE projectId = ?')
      .all(projectId) as { actualStart?: string | null; actualEnd?: string | null }[];

    const phaseCounts = countCompleted(phases);
    const workCounts = countCompleted(works);
    const taskCounts = countCompleted(tasks);

    return {
      phases: {
        done: phaseCounts.done,
        total: phaseCounts.total,
      },
      works: {
        done: workCounts.done,
        total: workCounts.total,
      },
      tasks: {
        done: taskCounts.done,
        total: taskCounts.total,
      },
    };
  },

  delete(projectId: string) {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    return result.changes > 0;
  },
};
