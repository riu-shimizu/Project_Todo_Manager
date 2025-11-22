import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { runMigrations } from '../infrastructure/migrations';
import { seedDemoData } from '../infrastructure/seed';
import { projectService } from '../application/projectService';
import { NotFoundError } from '../application/errors';

runMigrations();
seedDemoData();

const app = express();
app.use(cors());
app.use(express.json());

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const todoStatusValues = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const;
const todoStatusEnum = z.enum(todoStatusValues);

const planningSchema = z.object({
  title: z.string().min(1),
  plannedStart: z.string(),
  plannedEnd: z.string(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  memo: z.string().optional(),
});

const workSchema = planningSchema.extend({ phaseId: z.string().min(1) });
const taskSchema = planningSchema.extend({ workId: z.string().min(1) });

const planningPatchSchema = planningSchema.partial();
const todoPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    status: todoStatusEnum.optional(),
    assigneeId: z.string().min(1).optional(),
    dueDate: z.string().optional(),
    memo: z.string().optional(),
    referenceUrl: z.string().optional(),
    todayFlag: z.boolean().optional(),
  })
  .partial();

const todoSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  status: todoStatusEnum,
  assigneeId: z.string().min(1),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
  referenceUrl: z.string().optional(),
  todayFlag: z.boolean().optional(),
});

const todayFilterSchema = z.object({
  assigneeId: z.string().optional(),
  status: todoStatusEnum.optional(),
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/projects', (_req, res) => {
  const projects = projectService.listProjects();
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const body = createProjectSchema.parse(req.body);
  const project = projectService.createProject(body);
  res.status(201).json(project);
});

app.patch('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const body = updateProjectSchema.parse(req.body ?? {});
  const project = projectService.updateProject(projectId, body);
  res.json(project);
});

app.get('/api/projects/:projectId/hierarchy', (req, res) => {
  const { projectId } = req.params;
  const hierarchy = projectService.getHierarchy(projectId);
  res.json(hierarchy);
});

app.post('/api/projects/:projectId/phases', (req, res) => {
  const { projectId } = req.params;
  const body = planningSchema.parse(req.body);
  const phase = projectService.createPhase({ projectId, ...body });
  res.status(201).json(phase);
});

app.post('/api/projects/:projectId/works', (req, res) => {
  const { projectId } = req.params;
  const body = workSchema.parse(req.body);
  const work = projectService.createWork({ projectId, ...body });
  res.status(201).json(work);
});

app.post('/api/projects/:projectId/tasks', (req, res) => {
  const { projectId } = req.params;
  const body = taskSchema.parse(req.body);
  const task = projectService.createTask({ projectId, ...body });
  res.status(201).json(task);
});

app.post('/api/projects/:projectId/todos', (req, res) => {
  const { projectId } = req.params;
  const body = todoSchema.parse(req.body);
  const todo = projectService.createTodo({ projectId, ...body });
  res.status(201).json(todo);
});

app.patch('/api/phases/:id', (req, res) => {
  const { id } = req.params;
  const body = planningPatchSchema.parse(req.body ?? {});
  projectService.updatePhase(id, body);
  res.json({ ok: true });
});

app.patch('/api/works/:id', (req, res) => {
  const { id } = req.params;
  const body = planningPatchSchema.parse(req.body ?? {});
  projectService.updateWork(id, body);
  res.json({ ok: true });
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const body = planningPatchSchema.parse(req.body ?? {});
  projectService.updateTask(id, body);
  res.json({ ok: true });
});

app.patch('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const body = todoPatchSchema.parse(req.body ?? {});
  projectService.updateTodo(id, body);
  res.json({ ok: true });
});

app.post('/api/reorder', (req, res) => {
  const schema = z.object({
    type: z.enum(['phases', 'works', 'tasks', 'todos']),
    ids: z.array(z.string()),
  });
  const body = schema.parse(req.body);
  projectService.reorder(body.type, body.ids);
  res.json({ ok: true });
});

app.get('/api/projects/:projectId/today-todos', (req, res) => {
  const { projectId } = req.params;
  const { assigneeId, status } = req.query;
  const filter = todayFilterSchema.parse({
    assigneeId: typeof assigneeId === 'string' ? assigneeId : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  const todos = projectService.listTodayTodos(projectId, filter);
  res.json(todos);
});

app.delete('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  projectService.deleteProject(projectId);
  res.status(204).end();
});

app.delete('/api/phases/:id', (req, res) => {
  projectService.deletePhase(req.params.id);
  res.status(204).end();
});

app.delete('/api/works/:id', (req, res) => {
  projectService.deleteWork(req.params.id);
  res.status(204).end();
});

app.delete('/api/tasks/:id', (req, res) => {
  projectService.deleteTask(req.params.id);
  res.status(204).end();
});

app.delete('/api/todos/:id', (req, res) => {
  projectService.deleteTodo(req.params.id);
  res.status(204).end();
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof z.ZodError) {
    return res.status(400).json({ message: 'Validation error', issues: err.issues });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal Server Error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
