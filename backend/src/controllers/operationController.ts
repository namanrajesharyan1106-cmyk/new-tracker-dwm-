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

  // 1. Handle Task Updates with server-side validation
  if (taskUpdates && Array.isArray(taskUpdates)) {
    for (const update of taskUpdates) {
      const { taskId, status, progress, closingStatusText, reason, expectedCompletion, estimatedDelayDays } = update;
      
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) continue;

      if ((status === 'DELAYED' || status === 'BLOCKED') && (!reason || !reason.trim())) {
        return res.status(400).json({
          success: false,
          message: `Mandatory reason required for task: "${task.title}" marked as ${status}`
        });
      }

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

// Admin ONLY: Get Comprehensive Analytics Dashboard Data
export const getAdminAnalytics = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    delayedTasks,
    blockedTasks,
    overdueTasks,
    todayPlansCount,
    todayClosingsCount,
    delayHistories,
    sections
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({ where: { status: 'DELAYED' } }),
    prisma.task.count({ where: { status: 'BLOCKED' } }),
    prisma.task.count({ where: { status: 'OVERDUE' } }),
    prisma.dailyPlan.count({ where: { date: { gte: today } } }),
    prisma.dailyClosing.count({ where: { date: { gte: today } } }),
    prisma.taskDelayHistory.findMany({ take: 50, select: { reason: true } }),
    prisma.section.findMany({
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true, progress: true } }
      }
    })
  ]);

  // Aggregate Delay Reasons Frequency
  const delayReasonsMap: Record<string, number> = {};
  delayHistories.forEach(dh => {
    delayReasonsMap[dh.reason] = (delayReasonsMap[dh.reason] || 0) + 1;
  });
  const delayReasons = Object.entries(delayReasonsMap).map(([reason, count]) => ({ reason, count }));

  // Section Productivity metrics
  const sectionProductivity = sections.map(s => {
    const total = s.tasks.length;
    const completed = s.tasks.filter(t => t.status === 'COMPLETED').length;
    const avgProgress = total > 0 ? Math.round(s.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;
    return {
      sectionId: s.id,
      sectionName: s.name,
      totalTasks: total,
      completedTasks: completed,
      avgProgress
    };
  });

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
      },
      dailyActivity: {
        plansSubmittedToday: todayPlansCount,
        closingsSubmittedToday: todayClosingsCount
      },
      delayReasons,
      sectionProductivity
    }
  });
});

