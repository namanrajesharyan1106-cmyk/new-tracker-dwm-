import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  sectionId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  dependencyIds: z.array(z.string().uuid()).optional(),
  attachmentUrl: z.string().optional().nullable(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  sectionId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  dependencyIds: z.array(z.string().uuid()).optional(),
  attachmentUrl: z.string().optional().nullable(),
});

export const taskProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED', 'CANCELLED', 'OVERDUE']).optional(),
});

export const bulkAssignSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'Select at least one task'),
  assignedToId: z.string().uuid('Invalid user ID'),
});
