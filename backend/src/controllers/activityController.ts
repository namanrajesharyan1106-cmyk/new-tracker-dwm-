import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// GET ACTIVITIES FOR A REQUIREMENT / PROJECT
export const getActivities = asyncHandler(async (req: Request, res: Response) => {
  const requirementId = req.query.requirementId as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  
  const where: any = {};
  if (requirementId) where.requirementId = requirementId;
  if (projectId) where.projectId = projectId;

  const activities = await prisma.activity.findMany({
    where,
    include: {
      requirement: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          subtasks: true
        },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate dynamic activity progress based on subtasks/tasks
  const formattedActivities = activities.map(act => {
    const totalTasks = act.tasks.length;
    const completedTasks = act.tasks.filter(t => t.status === 'COMPLETED').length;
    const calculatedProgress = totalTasks > 0
      ? Math.round(act.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
      : act.progress;

    return {
      ...act,
      progress: calculatedProgress,
      totalTasks,
      completedTasks
    };
  });

  res.status(200).json({ success: true, data: formattedActivities });
});

// CREATE NEW ACTIVITY UNDER A REQUIREMENT / PROJECT
export const createActivity = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, requirementId, projectId, sectionId, teamId, startDate, targetDate, priority, estimatedHours, remarks } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Activity name is required' });
  }

  if (!requirementId && !projectId) {
    return res.status(400).json({ success: false, message: 'Parent Requirement ID or Project ID is required' });
  }

  const activity = await prisma.activity.create({
    data: {
      name: name.trim(),
      description,
      requirementId: requirementId || null,
      projectId: projectId || null,
      sectionId: sectionId || null,
      teamId: teamId || null,
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      priority: priority || 'MEDIUM',
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      remarks
    },
    include: {
      requirement: { select: { id: true, title: true } }
    }
  });

  res.status(201).json({ success: true, data: activity });
});

// UPDATE ACTIVITY
export const updateActivity = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, description, startDate, targetDate, priority, status, estimatedHours, actualHours, remarks, sectionId, teamId } = req.body;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found' });
  }

  if (name && name.trim()) {
    const existing = await prisma.activity.findFirst({
      where: {
        projectId: activity.projectId,
        name: { equals: name.trim() },
        id: { not: id }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Another activity with name "${name.trim()}" already exists in this project.` });
    }
  }

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: {
      name: name ? name.trim() : activity.name,
      description,
      startDate: startDate ? new Date(startDate) : activity.startDate,
      targetDate: targetDate ? new Date(targetDate) : activity.targetDate,
      priority: priority || activity.priority,
      status: status || activity.status,
      estimatedHours: estimatedHours !== undefined ? parseFloat(estimatedHours) : activity.estimatedHours,
      actualHours: actualHours !== undefined ? parseFloat(actualHours) : activity.actualHours,
      remarks,
      sectionId,
      teamId
    }
  });

  res.status(200).json({ success: true, data: updatedActivity });
});

// DELETE ACTIVITY
export const deleteActivity = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.activity.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Activity deleted successfully' });
});
