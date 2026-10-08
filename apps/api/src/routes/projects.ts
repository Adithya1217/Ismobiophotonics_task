import { Router } from 'express';
import { z } from 'zod';
import { PROJECT_STATUSES, projectSchema, taskQuerySchema, taskSchema } from '@taskflow/shared';
import { prisma } from '../db';
import { notFound, wrap } from '../errors';
import { requireAuth } from '../middleware/auth';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const projectQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

// Validate a project body and turn ISO date strings into Dates.
function projectData(body: unknown) {
  const { startDate, endDate, ...rest } = projectSchema.parse(body);
  return { ...rest, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null };
}

// Ownership guard: a project that is missing or someone else's is a 404.
export async function findOwnedProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) throw notFound();
  return project;
}

projectsRouter.get('/', wrap(async (req, res) => {
  const { search, status } = projectQuery.parse(req.query);
  const projects = await prisma.project.findMany({
    where: {
      userId: req.userId,
      ...(status && { status }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tasks: true } } },
  });
  res.json({ projects: projects.map(({ _count, ...p }) => ({ ...p, taskCount: _count.tasks })) });
}));

projectsRouter.post('/', wrap(async (req, res) => {
  const project = await prisma.project.create({ data: { ...projectData(req.body), userId: req.userId } });
  res.status(201).json({ project });
}));

projectsRouter.get('/:id', wrap(async (req, res) => {
  res.json({ project: await findOwnedProject(req.params.id, req.userId) });
}));

projectsRouter.put('/:id', wrap(async (req, res) => {
  await findOwnedProject(req.params.id, req.userId);
  const data = projectData(req.body);
  res.json({ project: await prisma.project.update({ where: { id: req.params.id }, data }) });
}));

projectsRouter.delete('/:id', wrap(async (req, res) => {
  await findOwnedProject(req.params.id, req.userId);
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

projectsRouter.get('/:id/tasks', wrap(async (req, res) => {
  await findOwnedProject(req.params.id, req.userId);
  const { search, status, priority } = taskQuerySchema.parse(req.query);
  const tasks = await prisma.task.findMany({
    where: {
      projectId: req.params.id,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ tasks });
}));

projectsRouter.post('/:id/tasks', wrap(async (req, res) => {
  await findOwnedProject(req.params.id, req.userId);
  const { dueDate, ...data } = taskSchema.parse(req.body);
  const task = await prisma.task.create({
    data: { ...data, dueDate: dueDate ? new Date(dueDate) : null, projectId: req.params.id },
  });
  res.status(201).json({ task });
}));
