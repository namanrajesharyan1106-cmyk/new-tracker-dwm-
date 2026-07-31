import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// Get current user's evening closing for today
export const getMyEveningClosing = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const closing = await prisma.dailyClosing.findFirst({
    where: {
      userId: req.user.id,
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  res.status(200).json({ success: true, data: closing });
});

// Submit evening closing and update tasks
export const submitEveningClosing = asyncHandler(async (req: any, res: Response) => {
  const { closingText, taskUpdates } = req.body;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Handle Task Updates
  if (taskUpdates && Array.isArray(taskUpdates)) {
    for (const update of taskUpdates) {
      const { taskId, status, progress, closingStatusText, reason, expectedCompletion, estimatedDelayDays } = update;
      
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) continue;

      // Update basic task info
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: status || task.status,
          progress: progress !== undefined ? progress : task.progress,
          closingStatusText: closingStatusText || task.closingStatusText,
          ...(status === 'COMPLETED' ? { completionDate: new Date() } : {})
        }
      });

      // Handle mandatory reasons for DELAYED
      if (status === 'DELAYED' && reason) {
        await prisma.taskDelayHistory.create({
          data: {
            taskId,
            reason,
            customReason: update.customReason || null,
            expectedCompletion: expectedCompletion ? new Date(expectedCompletion) : new Date(),
            estimatedDelayDays: estimatedDelayDays || 1,
            comments: closingStatusText
          }
        });
      }

      // Handle mandatory reasons for BLOCKED
      if (status === 'BLOCKED' && reason) {
        await prisma.taskBlockHistory.create({
          data: {
            taskId,
            reason,
            expectedResolution: expectedCompletion ? new Date(expectedCompletion) : null
          }
        });
      }
    }
  }

  // 2. Create or Update Daily Closing Record
  let closing = await prisma.dailyClosing.findFirst({
    where: {
      userId: req.user.id,
      date: { gte: today, lt: tomorrow }
    }
  });

  if (closing) {
    closing = await prisma.dailyClosing.update({
      where: { id: closing.id },
      data: { closingText: closingText || closing.closingText }
    });
  } else {
    closing = await prisma.dailyClosing.create({
      data: {
        userId: req.user.id,
        date: new Date(),
        closingText: closingText || ''
      }
    });
  }

  res.status(200).json({ success: true, data: closing });
});

// Admin ONLY: Get Analytics Dashboard Data
export const getAdminAnalytics = asyncHandler(async (req: any, res: Response) => {
  // Simple analytics gathering
  const totalProjects = await prisma.project.count();
  const activeProjects = await prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } });
  
  const totalTasks = await prisma.task.count();
  const completedTasks = await prisma.task.count({ where: { status: 'COMPLETED' } });
  const delayedTasks = await prisma.task.count({ where: { status: 'DELAYED' } });
  const blockedTasks = await prisma.task.count({ where: { status: 'BLOCKED' } });
  const overdueTasks = await prisma.task.count({ where: { status: 'OVERDUE' } });

  res.status(200).json({
    success: true,
    data: {
      projects: { total: totalProjects, active: activeProjects },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        delayed: delayedTasks,
        blocked: blockedTasks,
        overdue: overdueTasks
      }
    }
  });
});
