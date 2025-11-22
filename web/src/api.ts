import type { Project, ProjectHierarchyResponse, ProjectSummary, Todo, TodoStatus } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API Error');
  }
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  fetchProjects(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/projects');
  },

  fetchHierarchy(projectId: string): Promise<ProjectHierarchyResponse> {
    return request<ProjectHierarchyResponse>(`/projects/${projectId}/hierarchy`);
  },

  fetchTodayTodos(projectId: string, filter?: { assigneeId?: string; status?: TodoStatus }): Promise<Todo[]> {
    const params = new URLSearchParams();
    if (filter?.assigneeId) params.set('assigneeId', filter.assigneeId);
    if (filter?.status) params.set('status', filter.status);
    const query = params.toString();
    return request<Todo[]>(`/projects/${projectId}/today-todos${query ? `?${query}` : ''}`);
  },

  patchEntity(type: 'phases' | 'works' | 'tasks' | 'todos', id: string, payload: Record<string, unknown>): Promise<void> {
    return request<void>(`/${type}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  createPhase(projectId: string, payload: Record<string, unknown>): Promise<void> {
    return request<void>(`/projects/${projectId}/phases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createWork(projectId: string, payload: Record<string, unknown>): Promise<void> {
    return request<void>(`/projects/${projectId}/works`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createTask(projectId: string, payload: Record<string, unknown>): Promise<void> {
    return request<void>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createTodo(projectId: string, payload: Record<string, unknown>): Promise<void> {
    return request<void>(`/projects/${projectId}/todos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createProject(payload: { name: string; description?: string }): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  patchProject(projectId: string, payload: { name?: string; description?: string }): Promise<void> {
    return request<void>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  reorder(type: 'phases' | 'works' | 'tasks' | 'todos', ids: string[]): Promise<void> {
    return request<void>('/reorder', {
      method: 'POST',
      body: JSON.stringify({ type, ids }),
    });
  },

  deleteProject(projectId: string): Promise<void> {
    return request<void>(`/projects/${projectId}`, { method: 'DELETE' });
  },

  deletePhase(id: string): Promise<void> {
    return request<void>(`/phases/${id}`, { method: 'DELETE' });
  },

  deleteWork(id: string): Promise<void> {
    return request<void>(`/works/${id}`, { method: 'DELETE' });
  },

  deleteTask(id: string): Promise<void> {
    return request<void>(`/tasks/${id}`, { method: 'DELETE' });
  },

  deleteTodo(id: string): Promise<void> {
    return request<void>(`/todos/${id}`, { method: 'DELETE' });
  },
};
