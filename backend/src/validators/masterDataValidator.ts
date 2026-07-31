import { z } from 'zod';

export const sectionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
});

export const teamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  sectionId: z.string().uuid('Invalid section ID'),
});

export const userCreateSchema = z.object({
  employeeId: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().optional().nullable(),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_MEMBER']).default('TEAM_MEMBER'),
  designation: z.string().optional().nullable(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  mobile: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_MEMBER']).optional(),
  designation: z.string().optional().nullable(),
  isApproved: z.boolean().optional(),
});

export const userMappingSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
  teamIds: z.array(z.string().uuid()),
});
