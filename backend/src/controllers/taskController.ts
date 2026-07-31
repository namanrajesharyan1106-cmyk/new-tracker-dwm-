import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// ---- CREATE TASK ----
export const createTask = asyncHandler(async (req: any, res: Response) => {
  const { title, description, priority, sectionId, teamId, assignedToId, targetDate, estimatedHours, dependencyIds, attachmentUrl } = req.body;
  
  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      sectionId,
      teamId,
      assignedToId,
      targetDate: targetDate ? new Date(targetDate) : null,
      estimatedHours,
      createdById: req.user.id,
      status: 'NOT_STARTED',
      attachmentUrl,
      // Handle dependencies
      dependencies: dependencyIds && dependencyIds.length > 0 ? {
        connect: dependencyIds.map((id: string) => ({ id }))
      } : undefined
    },
    include: { dependencies: true }
  });

  res.status(201).json({ success: true, data: task });
});

// ---- GET TASKS ----
export const getTasks = asyncHandler(async (req: any, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';
  const filter = req.query.filter as string; // 'all', 'my_tasks', 'created_by_me'
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // RBAC & Filters
  if (req.user.role === 'TEAM_MEMBER') {
    where.OR = [
      { assignedToId: req.user.id },
      { createdById: req.user.id },
    ];
  } else {
    // Admins can see all, but can apply filters
    if (filter === 'my_tasks') where.assignedToId = req.user.id;
    if (filter === 'created_by_me') where.createdById = req.user.id;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        dependencies: { select: { id: true, title: true, status: true } },
        section: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.task.count({ where })
  ]);

  res.status(200).json({ success: true, data: tasks, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ---- UPDATE TASK DETAILS (ADMIN) ----
export const updateTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, priority, sectionId, teamId, assignedToId, targetDate, estimatedHours, dependencyIds, attachmentUrl } = req.body;
  
  // Update task and its dependencies
  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      priority,
      sectionId,
      teamId,
      assignedToId,
      targetDate: targetDate ? new Date(targetDate) : null,
      estimatedHours,
      attachmentUrl,
      dependencies: dependencyIds ? {
        set: dependencyIds.map((did: string) => ({ id: did }))
      } : undefined
    },
    include: { dependencies: true }
  });

  res.status(200).json({ success: true, data: task });
});

// ---- DELETE TASK (ADMIN) ----
export const deleteTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  await prisma.task.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Task deleted successfully' });
});

// ---- BULK ASSIGN TASKS (ADMIN) ----
export const bulkAssignTasks = asyncHandler(async (req: any, res: Response) => {
  const { taskIds, assignedToId } = req.body;
  
  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { assignedToId }
  });

  res.status(200).json({ success: true, message: 'Tasks successfully assigned' });
});

// ---- CLONE TASK (ADMIN) ----
export const cloneTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const originalTask = await prisma.task.findUnique({
    where: { id },
    include: { dependencies: true }
  });

  if (!originalTask) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const clonedTask = await prisma.task.create({
    data: {
      title: `${originalTask.title} (Clone)`,
      description: originalTask.description,
      priority: originalTask.priority,
      sectionId: originalTask.sectionId,
      teamId: originalTask.teamId,
      estimatedHours: originalTask.estimatedHours,
      createdById: req.user.id,
      status: 'NOT_STARTED',
      dependencies: {
        connect: originalTask.dependencies.map(d => ({ id: d.id }))
      }
    }
  });

  res.status(201).json({ success: true, data: clonedTask, message: 'Task cloned successfully' });
});

// ---- UPDATE TASK PROGRESS (USER) ----
export const updateTaskProgress = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { progress, status } = req.body;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  // Prevent users from updating tasks they are not assigned to (unless they created it or are admins)
  if (req.user.role === 'TEAM_MEMBER' && task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
  }

  const updateData: any = {};
  
  if (progress !== undefined) {
    updateData.progress = progress;
    if (progress === 100) updateData.status = 'COMPLETED';
    else if (progress > 0 && task.status === 'NOT_STARTED') updateData.status = 'IN_PROGRESS';
  }
  
  if (status) updateData.status = status;
  if (updateData.status === 'COMPLETED') updateData.completionDate = new Date();

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({ success: true, data: updatedTask });
});
