import { useEffect, useState, type FormEvent } from 'react';
import type { ProjectSummary } from '../types';

interface ProjectSidebarProps {
  projects: ProjectSummary[];
  selectedId?: string | null;
  onSelect: (projectId: string) => void;
  onRefresh: () => void;
  onCreate: (payload: { name: string; description?: string }) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export function ProjectSidebar({
  projects,
  selectedId,
  onSelect,
  onRefresh,
  onCreate,
  onDelete,
  selectedView,
  onSelectToday,
  onEditProjectName,
  onEditProjectDescription,
}: ProjectSidebarProps & {
  selectedView: 'project' | 'today';
  onSelectToday: () => void;
  onEditProjectName: (projectId: string) => void;
  onEditProjectDescription: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!openMenuId) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.project-menu') || target.closest('.project-menu-button')) {
        return;
      }
      setOpenMenuId(null);
    }

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [openMenuId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      setSubmitting(true);
      await onCreate({ name, description: description || undefined });
      setName('');
      setDescription('');
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('プロジェクトの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Projects</h1>
        <button onClick={onRefresh}>↻</button>
      </div>
      <div className="today-nav">
        <button
          className={`today-link ${selectedView === 'today' ? 'active' : ''}`}
          onClick={onSelectToday}
        >
          ☀ 今日の Todo
        </button>
      </div>
      <ul>
        {projects.map((project) => (
          <li key={project.id} className={project.id === selectedId ? 'active' : ''}>
            <div className="project-row">
              <button className="project-main-button" onClick={() => onSelect(project.id)}>
                <div className="project-name">{project.name}</div>
                <div className="project-meta">
                  <span>{project.progress}%</span>
                  <span>
                    {project.todoCounts.done}/{project.todoCounts.total}
                  </span>
                </div>
              </button>
              <button
                className="icon-button project-menu-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((current) => (current === project.id ? null : project.id));
                }}
                aria-label="プロジェクトメニュー"
              >
                ⋯
              </button>
              {openMenuId === project.id && (
                <div className="project-menu">
                  <button
                    type="button"
                    onClick={() => {
                      onEditProjectName(project.id);
                      setOpenMenuId(null);
                    }}
                  >
                    名前を編集
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditProjectDescription(project.id);
                      setOpenMenuId(null);
                    }}
                  >
                    説明を編集
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('プロジェクトを削除しますか？')) return;
                      try {
                        await onDelete(project.id);
                        setOpenMenuId(null);
                      } catch (err) {
                        console.error(err);
                        alert('プロジェクトの削除に失敗しました');
                      }
                    }}
                  >
                    プロジェクトを削除
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {projects.length === 0 && <p className="empty">プロジェクトがありません</p>}
      <div className="add-project">
        {!open && (
          <button className="ghost" onClick={() => setOpen(true)}>
            ＋ 新規プロジェクト
          </button>
        )}
        {open && (
          <form onSubmit={handleSubmit} className="add-form vertical">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プロジェクト名"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明 (任意)"
              rows={3}
            />
            <div className="add-actions">
              <button type="submit" disabled={submitting}>
                追加
              </button>
              <button type="button" className="ghost" onClick={() => setOpen(false)}>
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}
