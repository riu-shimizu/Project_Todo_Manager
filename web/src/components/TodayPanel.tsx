import type { Todo } from '../types';
import { StatusSelect } from './StatusSelect';
import { InlineInput } from './InlineInput';

interface TodayPanelProps {
  todos: Todo[];
  projectsById?: Record<string, { name: string }>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
}

export function TodayPanel({ todos, projectsById, onUpdate }: TodayPanelProps) {
  return (
    <section className="today-panel">
      <header>
        <h2>今日の Todo</h2>
        <span>{todos.length} 件</span>
      </header>
      {todos.length === 0 && <p className="empty">今日対応する Todo はありません。</p>}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className="today-row">
            <StatusSelect value={todo.status} onChange={(status) => onUpdate(todo.id, { status })} />
            <InlineInput value={todo.title} onSave={(title) => onUpdate(todo.id, { title })} />
            {projectsById && (
              <span className="today-project">
                {projectsById[todo.projectId]?.name ?? '（不明なプロジェクト）'}
              </span>
            )}
            <span className="due">{todo.dueDate ?? '期限なし'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
