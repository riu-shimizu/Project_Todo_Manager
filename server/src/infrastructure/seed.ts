import { nanoid } from 'nanoid';
import { DEMO_USER_ID } from '../domain/constants';
import db from './db';

export function seedDemoData() {
  const userStmt = db.prepare('INSERT OR IGNORE INTO users (id, name, email, createdAt) VALUES (?, ?, ?, ?)');
  userStmt.run(DEMO_USER_ID, 'Demo User', 'demo@example.com', new Date().toISOString());

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (projectCount.count > 0) {
    return;
  }

  const projectId = nanoid(12);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, name, description, ownerId, archived, createdAt)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(projectId, 'Sample Webアプリ構築', '要件定義に基づいたデモプロジェクト', DEMO_USER_ID, now);

  db.prepare(`
    INSERT INTO project_members (projectId, userId, role, createdAt)
    VALUES (?, ?, 'OWNER', ?)
  `).run(projectId, DEMO_USER_ID, now);

  const phases = [
    { title: '企画・計画', start: '2025-02-01', end: '2025-02-14', status: 'DONE' },
    { title: '実装', start: '2025-02-15', end: '2025-03-15', status: 'IN_PROGRESS' },
  ];

  phases.forEach((phase, phaseIndex) => {
    const phaseId = nanoid(12);
    const phaseActualStart = phase.status === 'DONE' || phase.status === 'IN_PROGRESS' ? phase.start : null;
    const phaseActualEnd = phase.status === 'DONE' ? phase.end : null;
    db.prepare(`
      INSERT INTO phases (id, projectId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).run(
      phaseId,
      projectId,
      phase.title,
      phase.start,
      phase.end,
      phaseActualStart,
      phaseActualEnd,
      phaseIndex,
      now,
      phase.status
    );

    const works = phaseIndex === 0
      ? [
          { title: '要求整理', start: '2025-02-01', end: '2025-02-07', status: 'DONE' },
          { title: 'アーキ設計', start: '2025-02-08', end: '2025-02-14', status: 'DONE' },
        ]
      : [
          { title: 'バックエンド', start: '2025-02-15', end: '2025-03-05', status: 'IN_PROGRESS' },
          { title: 'フロントエンド', start: '2025-03-01', end: '2025-03-15', status: 'NOT_STARTED' },
        ];

    works.forEach((work, workIndex) => {
      const workId = nanoid(12);
      const workActualStart = work.status === 'DONE' || work.status === 'IN_PROGRESS' ? work.start : null;
      const workActualEnd = work.status === 'DONE' ? work.end : null;
      db.prepare(`
        INSERT INTO works (id, projectId, phaseId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      `).run(
        workId,
        projectId,
        phaseId,
        work.title,
        work.start,
        work.end,
        workActualStart,
        workActualEnd,
        workIndex,
        now,
        work.status
      );

      const tasks = [
        { title: `${work.title} の詳細化`, start: work.start, end: work.end, status: 'IN_PROGRESS' },
        { title: `${work.title} のレビュー`, start: work.start, end: work.end, status: 'NOT_STARTED' },
      ];

      tasks.forEach((task, taskIndex) => {
        const taskId = nanoid(12);
        const taskActualStart = task.status === 'DONE' || task.status === 'IN_PROGRESS' ? task.start : null;
        const taskActualEnd = task.status === 'DONE' ? task.end : null;
        db.prepare(`
          INSERT INTO tasks (id, projectId, workId, title, plannedStart, plannedEnd, actualStart, actualEnd, memo, orderIndex, createdAt, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          taskId,
          projectId,
          workId,
          task.title,
          task.start,
          task.end,
          taskActualStart,
          taskActualEnd,
          taskIndex,
          now,
          task.status
        );

        const todos = [
          { title: '下書き作成', status: 'DONE', due: task.start },
          { title: 'レビュー対応', status: 'IN_PROGRESS', due: task.end },
          { title: '完了報告', status: 'NOT_STARTED', due: task.end },
        ];

        todos.forEach((todo, todoIndex) => {
          db.prepare(`
            INSERT INTO todos (id, projectId, taskId, title, status, assigneeId, dueDate, todayFlag, orderIndex, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            nanoid(12),
            projectId,
            taskId,
            todo.title,
            todo.status,
            DEMO_USER_ID,
            todo.due,
            todoIndex === 0 ? 1 : 0,
            todoIndex,
            now
          );
        });
      });
    });
  });
}
