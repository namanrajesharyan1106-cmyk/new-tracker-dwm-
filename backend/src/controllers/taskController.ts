import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

export const createTask = asyncHandler(async (req: any, res: Response) => {
  const { title, description, priority, sectionId, teamId, assignedToId, projectId, targetDate, estimatedHours } = req.body;
  
  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      sectionId,
      teamId,
      assignedToId,
      projectId,
      targetDate: targetDate ? new Date(targetDate) : null,
      estimatedHours,
      createdById: req.user.id,
      status: 'NOT_STARTED',
    },
  });

  res.status(201).json({ success: true, data: task });
});

export const getTasks = asyncHandler(async (req: any, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assignedToId: req.user.id },
        { createdById: req.user.id },
      ]
    },
    include: {
      project: true,
      assignedTo: { select: { id: true, name: true } },
    }
  });

  res.status(200).json({ success: true, data: tasks });
});

export const updateTaskStatus = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, progress, delayReason, expectedCompletion, estimatedDelayDays, customReason, comments, blockedReason, expectedResolution } = req.body;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  const updateData: any = { status };
  if (progress !== undefined) updateData.progress = progress;
  if (status === 'COMPLETED') updateData.completionDate = new Date();

  // Handle Delay
  if (status === 'DELAYED') {
    if (!delayReason || !expectedCompletion || !estimatedDelayDays) {
      res.status(400).json({ success: false, message: 'Delay reason, expected completion, and estimated delay are mandatory for delayed tasks.' });
      return;
    }
    
    await prisma.taskDelayHistory.create({
      data: {
        taskId: id,
        reason: delayReason,
        customReason,
        expectedCompletion: new Date(expectedCompletion),
        estimatedDelayDays: parseInt(estimatedDelayDays, 10),
        comments,
      }
    });
  }

  // Handle Blocked
  if (status === 'BLOCKED') {
    if (!blockedReason) {
      res.status(400).json({ success: false, message: 'Blocked reason is mandatory for blocked tasks.' });
      return;
    }
    
    await prisma.taskBlockHistory.create({
      data: {
        taskId: id,
        reason: blockedReason,
        expectedResolution: expectedResolution ? new Date(expectedResolution) : null,
      }
    });
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({ success: true, data: updatedTask });
});
