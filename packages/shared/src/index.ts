import { z } from 'zod';

export const PROJECT_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const email = z.string().trim().toLowerCase().email('Enter a valid email');
const password = z.string().min(8, 'At least 8 characters').max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email,
  password,
});
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });

const optText = z.string().trim().max(1000).optional().nullable();
const isoDate = z.string().datetime().optional().nullable();
export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: optText,
  status: z.enum(PROJECT_STATUSES).default('NOT_STARTED'),
  startDate: isoDate,
  endDate: isoDate,
}).refine((p) => !p.startDate || !p.endDate || p.endDate >= p.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});
export const taskSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: optText,
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  status: z.enum(TASK_STATUSES).default('PENDING'),
  dueDate: z.string().datetime().optional().nullable(),
});
export const taskCreateSchema = taskSchema.extend({ projectId: z.string().uuid('Invalid project') });
export const taskQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  projectId: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type TaskInput = z.input<typeof taskSchema>;

export interface User { id: string; name: string; email: string }
export interface Project {
  id: string; name: string; description: string | null; status: ProjectStatus;
  startDate: string | null; endDate: string | null;
  createdAt: string; updatedAt: string; taskCount?: number;
}
export interface Task {
  id: string; projectId: string; name: string; description: string | null;
  priority: TaskPriority; status: TaskStatus; dueDate: string | null;
  createdAt: string; updatedAt: string;
}
export interface DashboardStats {
  totalProjects: number; totalTasks: number; completedTasks: number;
  pendingTasks: number; inProgressProjects: number;
}
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[]> };
}

// Stockpile design tokens (light theme only)
export { tokens } from './tokens';
