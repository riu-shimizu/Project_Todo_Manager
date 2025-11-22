import { useState, type FormEvent } from 'react';
import type { PhaseNode, TaskNode, WorkNode } from '../types';
import { InlineInput } from './InlineInput';
import { StatusSelect } from './StatusSelect';

interface HierarchyViewProps {
  phases: PhaseNode[];
  showWorksByPhase: Record<string, boolean>;
  showTasksByWork: Record<string, boolean>;
  showTodosByTask: Record<string, boolean>;
  onTogglePhaseWorks: (id: string) => void;
  onToggleWorkTasks: (id: string) => void;
  onToggleTaskTodos: (id: string) => void;
  onUpdatePhase: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onUpdateWork: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onUpdateTodo: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onAddPhase: (payload: { title: string; plannedStart: string; plannedEnd: string }) => Promise<void>;
  onAddWork: (phaseId: string, payload: { title: string; plannedStart: string; plannedEnd: string }) => Promise<void>;
  onAddTask: (workId: string, payload: { title: string; plannedStart: string; plannedEnd: string }) => Promise<void>;
  onAddTodo: (taskId: string, payload: { title: string; dueDate?: string }) => Promise<void>;
  onDeletePhase: (id: string) => Promise<void>;
  onDeleteWork: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

export function HierarchyView(props: HierarchyViewProps) {
  const { phases } = props;

  return (
    <div className="hierarchy">
      <div className="hierarchy-header">
        <div>
          <p className="hierarchy-title">プロジェクト計画</p>
        </div>
        <AddPlanningButton label="＋ 大項目" onSubmit={props.onAddPhase} />
      </div>
      {phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          showWorks={props.showWorksByPhase[phase.id] ?? true}
          onToggleWorks={() => props.onTogglePhaseWorks(phase.id)}
          {...props}
        />
      ))}
      {phases.length === 0 && <p className="empty">大項目がまだありません。</p>}
    </div>
  );
}

function PhaseCard({
  phase,
  showWorks,
  onToggleWorks,
  showTasksByWork,
  showTodosByTask,
  onToggleWorkTasks,
  onToggleTaskTodos,
  ...handlers
}: {
  phase: PhaseNode;
  showWorks: boolean;
  onToggleWorks: () => void;
  showTasksByWork: Record<string, boolean>;
  showTodosByTask: Record<string, boolean>;
  onToggleWorkTasks: (id: string) => void;
  onToggleTaskTodos: (id: string) => void;
} & HierarchyViewProps) {

  async function handleDelete() {
    if (!window.confirm('大項目を削除しますか？')) return;
    try {
      await handlers.onDeletePhase(phase.id);
    } catch (err) {
      console.error(err);
      alert('大項目の削除に失敗しました');
    }
  }

  return (
    <section className="phase-card">
      <div className="phase-header" data-plan-item-id={phase.id}>
        <InlineInput value={phase.title} onSave={(title) => handlers.onUpdatePhase(phase.id, { title })} />
        <StatusSelect value={phase.status} onChange={(status) => handlers.onUpdatePhase(phase.id, { status })} />
        <ProgressBar value={phase.progress} />
        <button className="icon-button" onClick={handleDelete} aria-label="大項目削除">
          ✕
        </button>
      </div>
      <div className="dates">
        <span>予定</span>
        <InlineInput type="date" value={phase.plannedStart} onSave={(plannedStart) => handlers.onUpdatePhase(phase.id, { plannedStart })} />
        <span>〜</span>
        <InlineInput type="date" value={phase.plannedEnd} onSave={(plannedEnd) => handlers.onUpdatePhase(phase.id, { plannedEnd })} />
      </div>
      <div className="works">
        <div className="works-header">
          <div className="works-header-main">
            <button
              className="icon-button"
              onClick={onToggleWorks}
              aria-expanded={showWorks}
              aria-label={showWorks ? '中項目を折りたたむ' : '中項目を展開する'}
            >
              {showWorks ? '▽' : '▶'}
            </button>
            <h3>中項目</h3>
          </div>
          <AddPlanningButton
            label="＋ 中項目"
            onSubmit={(payload) => handlers.onAddWork(phase.id, payload)}
          />
        </div>
        {showWorks && (
          <>
            {phase.works.map((work) => (
              <WorkRow
                key={work.id}
                work={work}
                showTasks={showTasksByWork[work.id] ?? true}
                onToggleTasks={() => onToggleWorkTasks(work.id)}
                showTasksByWork={showTasksByWork}
                showTodosByTask={showTodosByTask}
                onToggleWorkTasks={onToggleWorkTasks}
                onToggleTaskTodos={onToggleTaskTodos}
                {...handlers}
              />
            ))}
            {phase.works.length === 0 && <p className="empty">中項目がありません</p>}
          </>
        )}
      </div>
    </section>
  );
}

function WorkRow({
  work,
  showTasks,
  onToggleTasks,
  showTodosByTask,
  onToggleTaskTodos,
  ...handlers
}: {
  work: WorkNode;
  showTasks: boolean;
  onToggleTasks: () => void;
  showTodosByTask: Record<string, boolean>;
  onToggleTaskTodos: (id: string) => void;
} & HierarchyViewProps) {

  async function handleDelete() {
    if (!window.confirm('中項目を削除しますか？')) return;
    try {
      await handlers.onDeleteWork(work.id);
    } catch (err) {
      console.error(err);
      alert('中項目の削除に失敗しました');
    }
  }

  return (
    <div className="work-row">
      <div className="work-main" data-plan-item-id={work.id}>
        <InlineInput value={work.title} onSave={(title) => handlers.onUpdateWork(work.id, { title })} />
        <StatusSelect value={work.status} onChange={(status) => handlers.onUpdateWork(work.id, { status })} />
        <ProgressBar value={work.progress} compact />
        <button className="icon-button" onClick={handleDelete} aria-label="中項目削除">
          ✕
        </button>
      </div>
      <div className="dates">
        <InlineInput type="date" value={work.plannedStart} onSave={(plannedStart) => handlers.onUpdateWork(work.id, { plannedStart })} />
        <span>〜</span>
        <InlineInput type="date" value={work.plannedEnd} onSave={(plannedEnd) => handlers.onUpdateWork(work.id, { plannedEnd })} />
      </div>
      <div className="tasks">
        <div className="tasks-header">
          <div className="tasks-header-main">
            <button
              className="icon-button"
              onClick={onToggleTasks}
              aria-expanded={showTasks}
              aria-label={showTasks ? '小項目を折りたたむ' : '小項目を展開する'}
            >
              {showTasks ? '▽' : '▶'}
            </button>
            <h4>小項目</h4>
          </div>
          <AddPlanningButton label="＋ 小項目" onSubmit={(payload) => handlers.onAddTask(work.id, payload)} />
        </div>
        {showTasks && (
          <>
            {work.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showTodos={showTodosByTask[task.id] ?? true}
                onToggleTodos={() => onToggleTaskTodos(task.id)}
                showTodosByTask={showTodosByTask}
                onToggleTaskTodos={onToggleTaskTodos}
                {...handlers}
              />
            ))}
            {work.tasks.length === 0 && <p className="empty">小項目がありません</p>}
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  showTodos,
  onToggleTodos,
  ...handlers
}: {
  task: TaskNode;
  showTodos: boolean;
  onToggleTodos: () => void;
} & HierarchyViewProps) {

  async function updateTodo(id: string, patch: Record<string, unknown>) {
    try {
      await handlers.onUpdateTodo(id, patch);
    } catch (err) {
      console.error(err);
      alert('Todo 更新に失敗しました');
    }
  }

  return (
    <div className="task-row">
      <div className="task-main" data-plan-item-id={task.id}>
        <InlineInput value={task.title} onSave={(title) => handlers.onUpdateTask(task.id, { title })} />
        <StatusSelect value={task.status} onChange={(status) => handlers.onUpdateTask(task.id, { status })} />
        <ProgressBar value={task.progress} compact />
        <button
          className="icon-button"
          onClick={async () => {
            if (!window.confirm('小項目を削除しますか？')) return;
            try {
              await handlers.onDeleteTask(task.id);
            } catch (err) {
              console.error(err);
              alert('小項目の削除に失敗しました');
            }
          }}
          aria-label="小項目削除"
        >
          ✕
        </button>
      </div>
      <div className="dates">
        <InlineInput
          type="date"
          value={task.plannedStart}
          onSave={(plannedStart) => handlers.onUpdateTask(task.id, { plannedStart })}
        />
        <span>〜</span>
        <InlineInput
          type="date"
          value={task.plannedEnd}
          onSave={(plannedEnd) => handlers.onUpdateTask(task.id, { plannedEnd })}
        />
      </div>
      <div className="todos">
        <button
          className="icon-button"
          onClick={onToggleTodos}
          aria-expanded={showTodos}
          aria-label={showTodos ? 'Todo を折りたたむ' : 'Todo を展開する'}
        >
          {showTodos ? '▽ Todo' : '▶ Todo'}
        </button>
        {showTodos && (
          <>
            {task.todos.map((todo) => (
              <div key={todo.id} className="todo-row" data-plan-item-id={`todo-${todo.id}`}>
                <StatusSelect value={todo.status} onChange={(status) => updateTodo(todo.id, { status })} />
                <InlineInput value={todo.title} onSave={(title) => updateTodo(todo.id, { title })} />
                <input
                  type="date"
                  className="inline-input"
                  value={todo.dueDate ?? ''}
                  onChange={async (e) => updateTodo(todo.id, { dueDate: e.target.value })}
                />
                <button
                  className="icon-button"
                  onClick={async () => {
                    if (!window.confirm('Todo を削除しますか？')) return;
                    try {
                      await handlers.onDeleteTodo(todo.id);
                    } catch (err) {
                      console.error(err);
                      alert('Todo の削除に失敗しました');
                    }
                  }}
                  aria-label="Todo削除"
                >
                  ✕
                </button>
              </div>
            ))}
            <AddTodoButton onSubmit={(payload) => handlers.onAddTodo(task.id, payload)} />
            {task.todos.length === 0 && <p className="empty">Todo がありません</p>}
          </>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, compact }: { value: number; compact?: boolean }) {
  return (
    <div className={`progress ${compact ? 'compact' : ''}`}>
      <div className="progress-value" style={{ width: `${value}%` }} />
      <span>{value}%</span>
    </div>
  );
}

function AddPlanningButton({
  label,
  onSubmit,
}: {
  label: string;
  onSubmit: (payload: { title: string; plannedStart: string; plannedEnd: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title) return;
    try {
      await onSubmit({ title, plannedStart: start, plannedEnd: end });
      setTitle('');
      setStart(today);
      setEnd(today);
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('追加に失敗しました');
    }
  }

  if (!open) {
    return (
      <button className="ghost" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" required />
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
      <button type="submit">追加</button>
      <button type="button" onClick={() => setOpen(false)}>
        キャンセル
      </button>
    </form>
  );
}

function AddTodoButton({ onSubmit }: { onSubmit: (payload: { title: string; dueDate?: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title) return;
    try {
      await onSubmit({ title, dueDate: due || undefined });
      setTitle('');
      setDue('');
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('Todo 追加に失敗しました');
    }
  }

  if (!open) {
    return (
      <button className="ghost" onClick={() => setOpen(true)}>
        ＋ Todo
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Todo タイトル" required />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <button type="submit">追加</button>
      <button type="button" onClick={() => setOpen(false)}>
        キャンセル
      </button>
    </form>
  );
}
