import { Router } from 'express';
import { prisma } from '../db';
import { wrap } from '../errors';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = Router();

// "Pending" = tasks not yet started (status PENDING); in-progress tasks are counted separately.
function pendingStatusFilter() {
  return { status: 'PENDING' as const };
}
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', wrap(async (req, res) => {
  const mine = { project: { userId: req.userId } };
  const [totalProjects, totalTasks, completedTasks, pendingTasks, inProgressProjects] = await Promise.all([
    prisma.project.count({ where: { userId: req.userId } }),
    prisma.task.count({ where: mine }),
    prisma.task.count({ where: { ...mine, status: 'COMPLETED' } }),
    prisma.task.count({ where: { ...mine, ...pendingStatusFilter() } }),
    prisma.project.count({ where: { userId: req.userId, status: 'IN_PROGRESS' } }),
  ]);
  res.json({ totalProjects, totalTasks, completedTasks, pendingTasks, inProgressProjects });
}));
