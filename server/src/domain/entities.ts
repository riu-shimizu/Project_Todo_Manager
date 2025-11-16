export type TodoStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface BaseEntity {
  id: string;
  createdAt: string;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  archived: boolean;
}

export interface Phase extends BaseEntity {
  projectId: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  memo?: string;
  orderIndex: number;
  status: TodoStatus;
}

export interface Work extends BaseEntity {
  projectId: string;
  phaseId: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  memo?: string;
  orderIndex: number;
  status: TodoStatus;
}

export interface Task extends BaseEntity {
  projectId: string;
  workId: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  memo?: string;
  orderIndex: number;
  status: TodoStatus;
}

export interface Todo extends BaseEntity {
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
}

export interface PhaseNode extends Phase {
  progress: number;
  works: WorkNode[];
}

export interface WorkNode extends Work {
  progress: number;
  tasks: TaskNode[];
}

export interface TaskNode extends Task {
  progress: number;
  todos: Todo[];
}

export interface ProjectSummary extends Project {
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

export interface TodayTodoFilter {
  assigneeId?: string;
  status?: TodoStatus;
}
