import { Router } from 'express';
import { taskCreateSchema, taskQuerySchema, taskSchema } from '@taskflow/shared';
import { prisma } from '../db';
import { notFound, wrap } from '../errors';
import { requireAuth } from '../middleware/auth';
import { findOwnedProject } from './projects';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

// Ownership guard via the parent project.
async function findOwnedTask(id: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id, project: { userId } } });
  if (!task) throw notFound();
  return task;
}

tasksRouter.get('/', wrap(async (req, res) => {
  const { search, status, priority, projectId } = taskQuerySchema.parse(req.query);
  const tasks = await prisma.task.findMany({
    where: {
      project: { userId: req.userId },
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ tasks });
}));

tasksRouter.post('/', wrap(async (req, res) => {
  const { dueDate, projectId, ...data } = taskCreateSchema.parse(req.body);
  await findOwnedProject(projectId, req.userId);
  const task = await prisma.task.create({ data: { ...data, dueDate: dueDate ? new Date(dueDate) : null, projectId } });
  res.status(201).json({ task });
}));

tasksRouter.get('/:id', wrap(async (req, res) => {
  res.json({ task: await findOwnedTask(req.params.id, req.userId) });
}));

tasksRouter.put('/:id', wrap(async (req, res) => {
  await findOwnedTask(req.params.id, req.userId);
  const { dueDate, ...data } = taskSchema.parse(req.body);
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { ...data, dueDate: dueDate ? new Date(dueDate) : null },
  });
  res.json({ task });
}));

tasksRouter.delete('/:id', wrap(async (req, res) => {
  await findOwnedTask(req.params.id, req.userId);
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));
