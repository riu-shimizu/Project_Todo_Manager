import { DEMO_USER_ID } from '../domain/constants';
import { PhaseNode, ProjectSummary, TaskNode, TodoStatus, WorkNode } from '../domain/entities';
import { projectRepository } from '../infrastructure/repositories/projectRepository';
import { hierarchyRepository } from '../infrastructure/repositories/hierarchyRepository';
import { userRepository } from '../infrastructure/repositories/userRepository';
import { calculateProgressFromStatuses, combineProgress, progressFromStatus } from '../domain/progress';
import { NotFoundError } from './errors';

interface CreateProjectPayload {
  name: string;
  description?: string;
}

interface BasePlanningPayload {
  projectId: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  memo?: string;
  status?: TodoStatus;
}

interface WorkPayload extends BasePlanningPayload {
  phaseId: string;
}

interface TaskPayload extends BasePlanningPayload {
  workId: string;
}

interface TodoPayload {
  projectId: string;
  taskId: string;
  title: string;
  status: TodoStatus;
  assigneeId: string;
  dueDate?: string;
  memo?: string;
  referenceUrl?: string;
  todayFlag?: boolean;
}

type BasePlanningUpdate = Partial<Omit<BasePlanningPayload, 'projectId'>>;
type WorkUpdate = Partial<Omit<WorkPayload, 'projectId'>>;
type TaskUpdate = Partial<Omit<TaskPayload, 'projectId'>>;
type TodoUpdate = Partial<Omit<TodoPayload, 'projectId'>>;
type ProjectUpdate = Partial<CreateProjectPayload>;

function ensureProject(projectId: string) {
  const project = projectRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  return project;
}

function deriveProgressFromStatuses(childStatuses: TodoStatus[], ownStatus: TodoStatus): number {
  if (childStatuses.length === 0) {
    return progressFromStatus(ownStatus);
  }
  return calculateProgressFromStatuses(childStatuses);
}

function calculateProjectProgress(projectId: string): number {
  const { phases, works } = hierarchyRepository.listPlanningStatuses(projectId);

  const workStatusesByPhase = new Map<string, TodoStatus[]>();
  works.forEach((work) => {
    if (!workStatusesByPhase.has(work.phaseId)) {
      workStatusesByPhase.set(work.phaseId, []);
    }
    workStatusesByPhase.get(work.phaseId)!.push(work.status);
  });

  const phaseProgresses = phases.map((phase) => {
    const childStatuses = workStatusesByPhase.get(phase.id) ?? [];
    return deriveProgressFromStatuses(childStatuses, phase.status);
  });

  return combineProgress(phaseProgresses);
}

export const projectService = {
  listProjects(): ProjectSummary[] {
    const projects = projectRepository.list();
    return projects.map((project) => {
      const stats = projectRepository.getTodoStats(project.id);
       const planningStats = projectRepository.getPlanningStats(project.id);
      const progress = calculateProjectProgress(project.id);
      return {
        ...project,
        progress,
        todoCounts: {
          total: stats.total,
          done: stats.done,
        },
        phaseCounts: {
          total: planningStats.phases.total,
          done: planningStats.phases.done,
        },
        workCounts: {
          total: planningStats.works.total,
          done: planningStats.works.done,
        },
        taskCounts: {
          total: planningStats.tasks.total,
          done: planningStats.tasks.done,
        },
      };
    });
  },

  createProject(payload: CreateProjectPayload) {
    userRepository.ensureDemoUser();
    const project = projectRepository.create({
      name: payload.name,
      description: payload.description,
      ownerId: DEMO_USER_ID,
    });
    projectRepository.addMember(project.id, DEMO_USER_ID, 'OWNER');
    return project;
  },

  updateProject(projectId: string, patch: ProjectUpdate) {
    ensureProject(projectId);
    const updated = projectRepository.update(projectId, patch);
    if (!updated) {
      throw new NotFoundError('Project not found');
    }
    return updated;
  },

  getHierarchy(projectId: string) {
    const project = ensureProject(projectId);
    const { phases, works, tasks, todos } = hierarchyRepository.listHierarchy(projectId);
    console.log(phases);
    const todosByTask = new Map<string, TaskNode['todos']>();
    todos.forEach((todo) => {
      if (!todosByTask.has(todo.taskId)) {
        todosByTask.set(todo.taskId, []);
      }
      todosByTask.get(todo.taskId)!.push(todo);
    });

    const tasksByWork = new Map<string, TaskNode[]>();
    tasks.forEach((task) => {
      const childTodos = todosByTask.get(task.id) ?? [];
      const progress = deriveProgressFromStatuses(
        childTodos.map((todo) => todo.status),
        task.status,
      );
      const node: TaskNode = { ...task, todos: childTodos, progress };
      if (!tasksByWork.has(task.workId)) {
        tasksByWork.set(task.workId, []);
      }
      tasksByWork.get(task.workId)!.push(node);
    });

    const worksByPhase = new Map<string, WorkNode[]>();
    works.forEach((work) => {
      const relatedTasks = (tasksByWork.get(work.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
      const progress = deriveProgressFromStatuses(
        relatedTasks.map((task) => task.status),
        work.status,
      );
      const node: WorkNode = { ...work, tasks: relatedTasks, progress };
      if (!worksByPhase.has(work.phaseId)) {
        worksByPhase.set(work.phaseId, []);
      }
      worksByPhase.get(work.phaseId)!.push(node);
    });

    const phaseNodes: PhaseNode[] = phases.map((phase) => {
      const relatedWorks = (worksByPhase.get(phase.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
      const progress = deriveProgressFromStatuses(
        relatedWorks.map((work) => work.status),
        phase.status,
      );
      return { ...phase, progress, works: relatedWorks };
    });

    return { project, phases: phaseNodes };
  },

  createPhase(payload: BasePlanningPayload) {
    ensureProject(payload.projectId);
    return hierarchyRepository.createPhase({
      ...payload,
      status: payload.status ?? 'NOT_STARTED',
    });
  },

  createWork(payload: WorkPayload) {
    ensureProject(payload.projectId);
    return hierarchyRepository.createWork({
      ...payload,
      status: payload.status ?? 'NOT_STARTED',
    });
  },

  createTask(payload: TaskPayload) {
    ensureProject(payload.projectId);
    return hierarchyRepository.createTask({
      ...payload,
      status: payload.status ?? 'NOT_STARTED',
    });
  },

  createTodo(payload: TodoPayload) {
    ensureProject(payload.projectId);
    return hierarchyRepository.createTodo({
      ...payload,
      todayFlag: payload.todayFlag ?? false,
    });
  },

  updatePhase(id: string, patch: BasePlanningUpdate) {
    hierarchyRepository.updatePhase(id, patch);
  },

  updateWork(id: string, patch: WorkUpdate) {
    hierarchyRepository.updateWork(id, patch);
  },

  updateTask(id: string, patch: TaskUpdate) {
    hierarchyRepository.updateTask(id, patch);
  },

  updateTodo(id: string, patch: TodoUpdate) {
    hierarchyRepository.updateTodo(id, patch);
  },

  reorder(table: 'phases' | 'works' | 'tasks' | 'todos', ids: string[]) {
    hierarchyRepository.reorder(table, ids);
  },

  listTodayTodos(projectId: string, filter: { assigneeId?: string; status?: TodoStatus }) {
    ensureProject(projectId);
    return hierarchyRepository.listTodayTodos(projectId, filter);
  },

  deleteProject(projectId: string) {
    ensureProject(projectId);
    projectRepository.delete(projectId);
  },

  deletePhase(id: string) {
    const deleted = hierarchyRepository.deletePhase(id);
    if (!deleted) {
      throw new NotFoundError('Phase not found');
    }
  },

  deleteWork(id: string) {
    const deleted = hierarchyRepository.deleteWork(id);
    if (!deleted) {
      throw new NotFoundError('Work not found');
    }
  },

  deleteTask(id: string) {
    const deleted = hierarchyRepository.deleteTask(id);
    if (!deleted) {
      throw new NotFoundError('Task not found');
    }
  },

  deleteTodo(id: string) {
    const deleted = hierarchyRepository.deleteTodo(id);
    if (!deleted) {
      throw new NotFoundError('Todo not found');
    }
  },
};
