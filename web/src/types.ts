export type TodoStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  archived: boolean;
  createdAt: string;
  progress: number;
  todoCounts: {
    total: number;
    done: number;
  };
  phaseCounts: {
    total: number;
    done: number;
  };
  workCounts: {
    total: number;
    done: number;
  };
  taskCounts: {
    total: number;
    done: number;
  };
}

export interface BaseItem {
  id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  memo?: string;
  orderIndex: number;
  status: TodoStatus;
}

export interface PhaseNode extends BaseItem {
  projectId: string;
  progress: number;
  works: WorkNode[];
}

export interface WorkNode extends BaseItem {
  projectId: string;
  phaseId: string;
  progress: number;
  tasks: TaskNode[];
}

export interface TaskNode extends BaseItem {
  projectId: string;
  workId: string;
  progress: number;
  todos: Todo[];
}

export interface Todo {
  id: string;
  projectId: string;
  taskId: string;
  title: string;
  status: TodoStatus;
  assigneeId: string;
  dueDate?: string;
  memo?: string;
  referenceUrl?: string;
  todayFlag: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  archived: boolean;
  createdAt: string;
}

export interface ProjectHierarchyResponse {
  project: Project;
  phases: PhaseNode[];
}
