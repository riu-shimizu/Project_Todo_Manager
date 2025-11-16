import { nanoid } from 'nanoid';
import { Project } from '../../domain/entities';
import db from '../db';

interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: string;
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
    const phaseRes = db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done,
           COUNT(id) AS total
         FROM phases
         WHERE projectId = ?`,
      )
      .get(projectId) as { done: number | null; total: number | null };

    const workRes = db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done,
           COUNT(id) AS total
         FROM works
         WHERE projectId = ?`,
      )
      .get(projectId) as { done: number | null; total: number | null };

    const taskRes = db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done,
           COUNT(id) AS total
         FROM tasks
         WHERE projectId = ?`,
      )
      .get(projectId) as { done: number | null; total: number | null };

    return {
      phases: {
        done: phaseRes.done ?? 0,
        total: phaseRes.total ?? 0,
      },
      works: {
        done: workRes.done ?? 0,
        total: workRes.total ?? 0,
      },
      tasks: {
        done: taskRes.done ?? 0,
        total: taskRes.total ?? 0,
      },
    };
  },

  delete(projectId: string) {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    return result.changes > 0;
  },
};
