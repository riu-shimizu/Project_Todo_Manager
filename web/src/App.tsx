import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from './api';
import { HierarchyView } from './components/HierarchyView';
import { GanttChart } from './components/GanttChart';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TodayPanel } from './components/TodayPanel';
import type { ProjectHierarchyResponse, ProjectSummary, Todo, TodoStatus } from './types';
import './App.css';

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'project' | 'today'>('project');
  const [hierarchy, setHierarchy] = useState<ProjectHierarchyResponse | null>(null);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [allTodayTodos, setAllTodayTodos] = useState<Todo[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWorksByPhase, setShowWorksByPhase] = useState<Record<string, boolean>>({});
  const [showTasksByWork, setShowTasksByWork] = useState<Record<string, boolean>>({});
  const [showTodosByTask, setShowTodosByTask] = useState<Record<string, boolean>>({});
  const [collapseHierarchy, setCollapseHierarchy] = useState(false);
  const [itemRects, setItemRects] = useState<Record<string, { top: number; height: number }>>({});
  const [ganttOffset, setGanttOffset] = useState(0);
  const hierarchyRef = useRef<HTMLDivElement | null>(null);
  const ganttRowsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      refreshHierarchy(selectedProjectId);
      refreshTodayTodos(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  async function loadProjects() {
    setError(null);
    try {
      const data = await api.fetchProjects();
      setProjects(data);
      if (!selectedProjectId && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('プロジェクト一覧の取得に失敗しました');
    }
  }

  async function refreshHierarchy(projectId: string) {
    setError(null);
    try {
      setLoadingHierarchy(true);
      const data = await api.fetchHierarchy(projectId);
      setHierarchy(data);
    } catch (err) {
      console.error(err);
      setError('階層データの取得に失敗しました');
    } finally {
      setLoadingHierarchy(false);
    }
  }

  async function refreshTodayTodos(projectId: string) {
    setError(null);
    try {
      const data = await api.fetchTodayTodos(projectId);
      setTodayTodos(data);
    } catch (err) {
      console.error(err);
      setError('今日の Todo 取得に失敗しました');
    }
  }

  async function refreshAllTodayTodos() {
    if (projects.length === 0) return;
    setError(null);
    try {
      const all = await Promise.all(projects.map((p) => api.fetchTodayTodos(p.id)));
      setAllTodayTodos(all.flat());
    } catch (err) {
      console.error(err);
      setError('今日の Todo 取得に失敗しました');
    }
  }

  async function mutate(action: () => Promise<any>, refreshProjectsAfter = false) {
    if (!selectedProjectId) return;
    const scrollY = window.scrollY;
    setError(null);
    try {
      await action();
      await Promise.all([refreshHierarchy(selectedProjectId), refreshTodayTodos(selectedProjectId)]);
      if (refreshProjectsAfter) {
        await loadProjects();
      }
    } catch (err) {
      console.error(err);
      setError('更新に失敗しました');
    } finally {
      window.scrollTo(0, scrollY);
    }
  }

  async function handleCreateProject(payload: { name: string; description?: string }) {
    setError(null);
    try {
      const project = await api.createProject(payload);
      await loadProjects();
      setSelectedProjectId(project.id);
    } catch (err) {
      console.error(err);
      setError('プロジェクトの作成に失敗しました');
      throw err;
    }
  }

  async function handleDeleteProject(projectId: string) {
    setError(null);
    try {
      await api.deleteProject(projectId);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setHierarchy(null);
        setTodayTodos([]);
      }
      await loadProjects();
    } catch (err) {
      console.error(err);
      setError('プロジェクトの削除に失敗しました');
      throw err;
    }
  }

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const projectsById = projects.reduce<Record<string, ProjectSummary>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  useEffect(() => {
    if (viewMode === 'today') {
      void refreshAllTodayTodos();
    }
  }, [viewMode, projects.length]);

  async function handleUpdateTodayTodo(id: string, patch: Record<string, unknown>) {
    await mutate(() => api.patchEntity('todos', id, patch), true);
    if (viewMode === 'today') {
      await refreshAllTodayTodos();
    }
  }

  async function handleEditProjectName(projectId: string) {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const next = window.prompt('プロジェクト名を編集', target.name);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === target.name) return;
    await mutate(() => api.patchProject(target.id, { name: trimmed }), true);
  }

  async function handleEditProjectDescription(projectId: string) {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const next = window.prompt('プロジェクトの説明を編集', target.description ?? '');
    if (next == null) return;
    const trimmed = next.trim();
    await mutate(
      () => api.patchProject(target.id, { description: trimmed || undefined }),
      true,
    );
  }

  function calcStatusProgress(statuses: TodoStatus[]): number {
    if (statuses.length === 0) return 0;
    const total = statuses.reduce((acc, status) => {
      if (status === 'DONE') return acc + 1;
      if (status === 'IN_PROGRESS') return acc + 0.5;
      return acc;
    }, 0);
    return Math.round((total / statuses.length) * 100);
  }

  function countStatuses(statuses: TodoStatus[]) {
    let notStarted = 0;
    let inProgress = 0;
    let done = 0;
    statuses.forEach((status) => {
      if (status === 'DONE') {
        done += 1;
      } else if (status === 'IN_PROGRESS') {
        inProgress += 1;
      } else {
        notStarted += 1;
      }
    });
    return { notStarted, inProgress, done };
  }

  function togglePhaseWorks(id: string) {
    setShowWorksByPhase((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function toggleWorkTasks(id: string) {
    setShowTasksByWork((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function toggleTaskTodos(id: string) {
    setShowTodosByTask((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  useLayoutEffect(() => {
    const root = hierarchyRef.current;
    const gantt = ganttRowsRef.current;
    if (!root || !gantt) return;

    function measure() {
      if (!root || !gantt) return;
      const baseTop = root.getBoundingClientRect().top;
      const ganttTop = gantt.getBoundingClientRect().top;
      const next: Record<string, { top: number; height: number }> = {};
      const nodes = root.querySelectorAll<HTMLElement>('[data-plan-item-id]');
      nodes.forEach((node) => {
        const id = node.dataset.planItemId;
        if (!id) return;
        const rect = node.getBoundingClientRect();
        next[id] = {
          top: rect.top - baseTop,
          height: rect.height,
        };
      });
      setItemRects(next);
      setGanttOffset(baseTop - ganttTop);
    }

    const id = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', measure);
    };
  }, [hierarchy, showWorksByPhase, showTasksByWork, showTodosByTask, collapseHierarchy]);

  return (
    <div className="app-shell">
      <ProjectSidebar
        projects={projects}
        selectedId={selectedProjectId}
        selectedView={viewMode}
        onSelectToday={() => setViewMode('today')}
        onEditProjectName={handleEditProjectName}
        onEditProjectDescription={handleEditProjectDescription}
        onSelect={(projectId) => {
          setSelectedProjectId(projectId);
          setViewMode('project');
        }}
        onRefresh={loadProjects}
        onCreate={handleCreateProject}
        onDelete={handleDeleteProject}
      />
      <main>
        {error && <div className="error">{error}</div>}
        {viewMode === 'today' && (
          <TodayPanel
            todos={allTodayTodos}
            projectsById={projectsById}
            onUpdate={handleUpdateTodayTodo}
          />
        )}
        {viewMode === 'project' && !currentProject && <p className="empty">プロジェクトを選択してください。</p>}
        {viewMode === 'project' && currentProject && hierarchy && (
          <>
            {(() => {
              const phases = hierarchy.phases || [];
              const phaseStatuses = phases.map((p) => p.status);
              const phaseProgress = calcStatusProgress(phaseStatuses);
              const phaseCounts = countStatuses(phaseStatuses);
              const workStatuses: TodoStatus[] = [];
              const taskStatuses: TodoStatus[] = [];
              const todoStatuses: TodoStatus[] = [];

              phases.forEach((phase) => {
                phase.works.forEach((work) => {
                  workStatuses.push(work.status);
                  work.tasks.forEach((task) => {
                    taskStatuses.push(task.status);
                    task.todos.forEach((todo) => {
                      todoStatuses.push(todo.status);
                    });
                  });
                });
              });

              const workProgress = calcStatusProgress(workStatuses);
              const taskProgress = calcStatusProgress(taskStatuses);
              const todoProgress = calcStatusProgress(todoStatuses);
              const workCounts = countStatuses(workStatuses);
              const taskCounts = countStatuses(taskStatuses);
              const todoCounts = countStatuses(todoStatuses);

              return (
                <header className="project-header">
                  <div className="project-header-main">
                    <div className="project-title-row">
                      <h1 className="project-title-text">{currentProject.name}</h1>
                    </div>
                    {currentProject.description && (
                      <p className="project-description-text">{currentProject.description}</p>
                    )}
                  </div>
                  <div className="project-stat">
                    <div className="project-stat-row">
                      <span>大項目</span>
                      <div className="progress compact">
                        <div className="progress-value" style={{ width: `${phaseProgress}%` }} />
                        <span>
                          {phaseProgress}%（{phaseCounts.notStarted}/{phaseCounts.inProgress}/{phaseCounts.done}）
                        </span>
                      </div>
                    </div>
                    <div className="project-stat-row">
                      <span>中項目</span>
                      <div className="progress compact">
                        <div className="progress-value" style={{ width: `${workProgress}%` }} />
                        <span>
                          {workProgress}%（{workCounts.notStarted}/{workCounts.inProgress}/{workCounts.done}）
                        </span>
                      </div>
                    </div>
                    <div className="project-stat-row">
                      <span>小項目</span>
                      <div className="progress compact">
                        <div className="progress-value" style={{ width: `${taskProgress}%` }} />
                        <span>
                          {taskProgress}%（{taskCounts.notStarted}/{taskCounts.inProgress}/{taskCounts.done}）
                        </span>
                      </div>
                    </div>
                    <div className="project-stat-row">
                      <span>Todo</span>
                      <div className="progress compact">
                        <div className="progress-value" style={{ width: `${todoProgress}%` }} />
                        <span>
                          {todoProgress}%（{todoCounts.notStarted}/{todoCounts.inProgress}/{todoCounts.done}）
                        </span>
                      </div>
                    </div>
                    <div className="project-stat-row">
                      <span />
                      <small>（未着手 / 進行中 / 完了）</small>
                    </div>
                  </div>
                </header>
              );
            })()}
            <div className="project-layout-toolbar">
              <button
                className="ghost"
                onClick={() => setCollapseHierarchy((prev) => !prev)}
                aria-pressed={collapseHierarchy}
              >
                {collapseHierarchy ? '左の項目を表示' : '左の項目を折りたたむ'}
              </button>
            </div>
            <div className={`project-layout ${collapseHierarchy ? 'collapsed' : ''}`}>
              {!collapseHierarchy && (
                <div className="project-main-column" ref={hierarchyRef}>
                  {loadingHierarchy && <p>読込中...</p>}
                  <div className="project-board">
                    <HierarchyView
                      phases={hierarchy.phases || []}
                      showWorksByPhase={showWorksByPhase}
                      showTasksByWork={showTasksByWork}
                      showTodosByTask={showTodosByTask}
                      onTogglePhaseWorks={togglePhaseWorks}
                      onToggleWorkTasks={toggleWorkTasks}
                      onToggleTaskTodos={toggleTaskTodos}
                      onUpdatePhase={(id, patch) => mutate(() => api.patchEntity('phases', id, patch), true)}
                      onUpdateWork={(id, patch) => mutate(() => api.patchEntity('works', id, patch), true)}
                      onUpdateTask={(id, patch) => mutate(() => api.patchEntity('tasks', id, patch), true)}
                      onUpdateTodo={(id, patch) => mutate(() => api.patchEntity('todos', id, patch), true)}
                      onAddPhase={(payload) => mutate(() => api.createPhase(currentProject.id, payload), true)}
                      onAddWork={(phaseId, payload) =>
                        mutate(() => api.createWork(currentProject.id, { ...payload, phaseId }), true)
                      }
                      onAddTask={(workId, payload) =>
                        mutate(() => api.createTask(currentProject.id, { ...payload, workId }), true)
                      }
                      onAddTodo={(taskId, payload) =>
                        mutate(() =>
                          api.createTodo(currentProject.id, {
                            ...payload,
                            taskId,
                            status: 'NOT_STARTED',
                            assigneeId: currentProject.ownerId,
                          }),
                          true,
                        )
                      }
                      onDeletePhase={(id) => mutate(() => api.deletePhase(id), true)}
                      onDeleteWork={(id) => mutate(() => api.deleteWork(id), true)}
                      onDeleteTask={(id) => mutate(() => api.deleteTask(id), true)}
                      onDeleteTodo={(id) => mutate(() => api.deleteTodo(id), true)}
                    />
                  </div>
                  <TodayPanel
                    todos={todayTodos}
                    onUpdate={(id, patch) => mutate(() => api.patchEntity('todos', id, patch), true)}
                  />
                </div>
              )}
              <div className="project-gantt-column">
                <GanttChart
                  phases={hierarchy.phases || []}
                  showWorksByPhase={showWorksByPhase}
                  showTasksByWork={showTasksByWork}
                  showTodosByTask={showTodosByTask}
                  itemRects={itemRects}
                  ganttOffset={ganttOffset}
                  rowsRef={ganttRowsRef}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
