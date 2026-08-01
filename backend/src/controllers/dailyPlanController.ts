import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// ---- 1. GET MORNING PLANNING AUTO-SUMMARY ----
export const getMorningPlanningSummary = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check existing plan & closing for today
  const [existingPlan, existingClosing] = await Promise.all([
    prisma.dailyPlan.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { projects: true, tasks: true }
    }),
    prisma.dailyClosing.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } }
    })
  ]);

  // Auto-fetch assigned tasks, recurring tasks, carry forward tasks, personal tasks
  const [assignedTasks, carryForwardTasks, recurringTasks, personalTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { assignedUsers: { some: { userId } } }
        ],
        type: { not: 'PERSONAL_TASK' },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'ASSIGNED', 'ACCEPTED'] }
      },
      include: { project: { select: { id: true, name: true } }, activity: { select: { id: true, name: true } } }
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { assignedUsers: { some: { userId } } }
        ],
        carryForwardCount: { gt: 0 },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'DELAYED'] }
      }
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { createdById: userId }
        ],
        isRecurring: true
      }
    }),
    prisma.task.findMany({
      where: {
        createdById: userId,
        type: 'PERSONAL_TASK',
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
      }
    })
  ]);

  res.status(200).json({
    success: true,
    data: {
      existingPlan,
      isClosingSubmitted: !!existingClosing,
      assignedTasks,
      carryForwardTasks,
      recurringTasks,
      personalTasks
    }
  });
});

// ---- 2. SUBMIT MORNING PLAN (WITH ATTENDANCE & LOCK CHECK) ----
export const submitMorningPlan = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { topPriorities, top3TaskIds, expectedHours, strategy, remarks, supportRequired, planText, taskIds, projectIds } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check attendance status
  const attendance = await prisma.attendance.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } }
  });

  if (attendance && ['ABSENT', 'LEAVE', 'HOLIDAY'].includes(attendance.status)) {
    return res.status(400).json({ success: false, message: `Cannot submit Morning Planning. Attendance status is marked as ${attendance.status}.` });
  }

  // Check if Closing is already submitted for today
  const closing = await prisma.dailyClosing.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } }
  });

  if (closing) {
    return res.status(400).json({ success: false, message: 'Evening Closing is already submitted for today. Morning Planning cannot be modified.' });
  }

  let plan = await prisma.dailyPlan.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } }
  });

  if (plan && plan.isLocked) {
    return res.status(400).json({ success: false, message: 'Morning Planning is approved and locked. Contact your Team Lead to unlock for edits.' });
  }

  const planPayload = {
    planText: planText || topPriorities || 'Daily Morning Planning',
    topPriorities,
    top3TaskIds: Array.isArray(top3TaskIds) ? top3TaskIds.join(',') : top3TaskIds,
    expectedHours: expectedHours ? parseFloat(expectedHours) : 8.0,
    strategy,
    remarks,
    supportRequired,
    isSubmitted: true,
    approvalStatus: 'PENDING_APPROVAL',
    projects: {
      set: (projectIds || []).map((id: string) => ({ id }))
    },
    tasks: {
      set: (taskIds || []).map((id: string) => ({ id }))
    }
  };

  if (plan) {
    plan = await prisma.dailyPlan.update({
      where: { id: plan.id },
      data: planPayload,
      include: { projects: true, tasks: true }
    });
  } else {
    plan = await prisma.dailyPlan.create({
      data: {
        userId,
        date: new Date(),
        ...planPayload,
        projects: {
          connect: (projectIds || []).map((id: string) => ({ id }))
        },
        tasks: {
          connect: (taskIds || []).map((id: string) => ({ id }))
        }
      },
      include: { projects: true, tasks: true }
    });
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'SUBMIT_MORNING_PLAN',
      entity: 'DailyPlan',
      entityId: plan.id,
      details: JSON.stringify({ expectedHours, tasksCount: taskIds?.length || 0 })
    }
  });

  res.status(200).json({ success: true, data: plan, message: 'Morning Planning submitted successfully!' });
});

// ---- 3. SUBMIT EVENING CLOSING & CARRY FORWARD ENGINE ----
export const submitEveningClosing = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { closingText, actualHoursWorked, achievements, problemsFaced, tomorrowPriority, supportRequired, unfinishedTaskUpdates } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plan = await prisma.dailyPlan.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
    include: { tasks: true }
  });

  if (!plan) {
    return res.status(400).json({ success: false, message: 'Please submit Morning Planning before completing Evening Closing.' });
  }

  // Process unfinished task updates & carry forward engine
  if (unfinishedTaskUpdates && Array.isArray(unfinishedTaskUpdates)) {
    for (const update of unfinishedTaskUpdates) {
      const { taskId, status, delayReason, blockReason, carryForwardReason } = update;
      
      if (status === 'DELAYED' && (!delayReason || !delayReason.trim())) {
        return res.status(400).json({ success: false, message: `Delay reason is mandatory for task ID ${taskId}` });
      }
      if (status === 'BLOCKED' && (!blockReason || !blockReason.trim())) {
        return res.status(400).json({ success: false, message: `Block reason is mandatory for task ID ${taskId}` });
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task && status !== 'COMPLETED') {
        const nextTarget = new Date();
        nextTarget.setDate(nextTarget.getDate() + 1);

        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: status || task.status,
            delayReason: delayReason || task.delayReason,
            blockReason: blockReason || task.blockReason,
            carryForwardCount: (task.carryForwardCount || 0) + 1,
            carryForwardReason: carryForwardReason || 'Unfinished in daily closing',
            originalDate: task.originalDate || task.createdAt,
            targetDate: nextTarget
          }
        });
      }
    }
  }

  const plannedTasks = plan.tasks;
  const completedTasks = plannedTasks.filter(t => t.status === 'COMPLETED');
  const pendingTasks = plannedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'DELAYED' && t.status !== 'BLOCKED');
  const delayedTasks = plannedTasks.filter(t => t.status === 'DELAYED');
  const blockedTasks = plannedTasks.filter(t => t.status === 'BLOCKED');

  const productivityScore = plannedTasks.length > 0 
    ? Math.round((completedTasks.length / plannedTasks.length) * 100) 
    : 100;

  const closing = await prisma.dailyClosing.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      closingText: closingText || achievements || 'Daily Evening Closing Submitted',
      completedTaskIds: completedTasks.map(t => t.id).join(','),
      pendingTaskIds: pendingTasks.map(t => t.id).join(','),
      delayedTaskIds: delayedTasks.map(t => t.id).join(','),
      blockedTaskIds: blockedTasks.map(t => t.id).join(','),
      actualHoursWorked: actualHoursWorked ? parseFloat(actualHoursWorked) : 8.0,
      achievements,
      problemsFaced,
      tomorrowPriority,
      supportRequired,
      productivityScore,
      isSubmitted: true
    },
    create: {
      userId,
      date: new Date(),
      closingText: closingText || achievements || 'Daily Evening Closing Submitted',
      completedTaskIds: completedTasks.map(t => t.id).join(','),
      pendingTaskIds: pendingTasks.map(t => t.id).join(','),
      delayedTaskIds: delayedTasks.map(t => t.id).join(','),
      blockedTaskIds: blockedTasks.map(t => t.id).join(','),
      actualHoursWorked: actualHoursWorked ? parseFloat(actualHoursWorked) : 8.0,
      achievements,
      problemsFaced,
      tomorrowPriority,
      supportRequired,
      productivityScore,
      isSubmitted: true
    }
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'SUBMIT_EVENING_CLOSING',
      entity: 'DailyClosing',
      entityId: closing.id,
      details: JSON.stringify({ productivityScore, completedCount: completedTasks.length })
    }
  });

  res.status(200).json({ success: true, data: closing, message: 'Evening Closing submitted successfully!' });
});

// ---- 4. GET TODAY'S TIMELINE AND SUMMARY ----
export const getDailyTimelineAndSummary = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [plan, closing, workLogs, auditLogs] = await Promise.all([
    prisma.dailyPlan.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { tasks: true, projects: true }
    }),
    prisma.dailyClosing.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } }
    }),
    prisma.taskWorkLog.findMany({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.auditLog.findMany({
      where: { userId, createdAt: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const totalActualHours = workLogs.reduce((sum, log) => sum + log.hoursWorked, 0);

  res.status(200).json({
    success: true,
    data: {
      plan,
      closing,
      workLogs,
      auditLogs,
      summary: {
        plannedTasksCount: plan?.tasks?.length || 0,
        completedTasksCount: plan?.tasks?.filter(t => t.status === 'COMPLETED').length || 0,
        totalActualHours,
        productivityScore: closing?.productivityScore || 0
      }
    }
  });
});

// ---- 5. GET TOMORROW PLANNING SUGGESTIONS ----
export const getTomorrowSuggestions = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;

  const [carryForward, highPriority, recurring] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [{ assignedToId: userId }, { assignedUsers: { some: { userId } } }],
        carryForwardCount: { gt: 0 },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'DELAYED'] }
      }
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assignedToId: userId }, { assignedUsers: { some: { userId } } }],
        priority: 'HIGH',
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
      }
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assignedToId: userId }, { createdById: userId }],
        isRecurring: true
      }
    })
  ]);

  res.status(200).json({
    success: true,
    data: {
      carryForward,
      highPriority,
      recurring
    }
  });
});

// ---- 6. TEAM MORNING MEETING VIEW API ----
export const getTeamMorningMeetingView = asyncHandler(async (req: any, res: Response) => {
  const { teamId, sectionId, search } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const memberWhere: any = { isActive: true };
  if (search) {
    memberWhere.OR = [
      { name: { contains: search } },
      { employeeId: { contains: search } }
    ];
  }

  if (teamId) {
    memberWhere.teams = { some: { teamId } };
  } else if (sectionId) {
    memberWhere.sections = { some: { sectionId } };
  }

  const members = await prisma.user.findMany({
    where: memberWhere,
    select: {
      id: true,
      name: true,
      employeeId: true,
      designation: true,
      role: true,
      teams: { include: { team: { select: { id: true, name: true, sectionId: true } } } },
      sections: { include: { section: { select: { id: true, name: true } } } }
    }
  });

  const memberSummaries = await Promise.all(
    members.map(async m => {
      const [todayAttendance, todayPlan, yesterdayClosing, activeTasks, blockedTasks, carryForwardCount] = await Promise.all([
        prisma.attendance.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } } }),
        prisma.dailyPlan.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { tasks: true } }),
        prisma.dailyClosing.findFirst({ where: { userId: m.id, date: { gte: yesterday, lt: today } } }),
        prisma.task.findMany({ where: { assignedToId: m.id, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } } }),
        prisma.task.findMany({ where: { assignedToId: m.id, status: 'BLOCKED' }, select: { title: true, blockReason: true } }),
        prisma.task.count({ where: { assignedToId: m.id, carryForwardCount: { gt: 0 } } })
      ]);

      const yesterdayCompleted = yesterdayClosing?.completedTaskIds ? yesterdayClosing.completedTaskIds.split(',').length : 0;

      return {
        member: m,
        attendanceStatus: todayAttendance?.status || 'PRESENT',
        yesterdaySummary: `${yesterdayCompleted} Tasks Completed`,
        todayPlanStatus: todayPlan ? todayPlan.approvalStatus : 'NOT_SUBMITTED',
        isLocked: todayPlan?.isLocked || false,
        plannedTasksCount: todayPlan?.tasks?.length || activeTasks.length,
        topPriorities: todayPlan?.topPriorities || 'No priorities entered',
        supportRequired: todayPlan?.supportRequired || null,
        blockedTasks,
        carryForwardCount
      };
    })
  );

  res.status(200).json({ success: true, data: memberSummaries });
});

// ---- 7. TEAM LEAD APPROVAL & LOCK WORKFLOW ----
export const approveOrRejectDailyPlan = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { action, comments } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ success: false, message: 'Only Team Leads and Admins can approve daily plans' });
  }

  const plan = await prisma.dailyPlan.findUnique({ where: { id } });
  if (!plan) return res.status(404).json({ success: false, message: 'Daily plan not found' });

  await prisma.dailyPlanApprovalHistory.create({
    data: {
      dailyPlanId: id,
      approverId: req.user.id,
      action,
      comments
    }
  });

  const updatedPlan = await prisma.dailyPlan.update({
    where: { id },
    data: {
      approvalStatus: action,
      approvedById: req.user.id,
      approvedAt: new Date(),
      rejectionReason: action === 'REJECTED' ? comments : null,
      isLocked: action === 'APPROVED'
    }
  });

  res.status(200).json({ success: true, data: updatedPlan, message: `Plan ${action.toLowerCase()} successfully` });
});

// ---- 8. UNLOCK DAILY PLAN FOR MEMBER EDIT ----
export const unlockDailyPlan = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ success: false, message: 'Only Team Leads and Admins can unlock plans' });
  }

  await prisma.dailyPlanApprovalHistory.create({
    data: {
      dailyPlanId: id,
      approverId: req.user.id,
      action: 'UNLOCKED',
      comments: 'Unlocked for editing'
    }
  });

  const updatedPlan = await prisma.dailyPlan.update({
    where: { id },
    data: {
      isLocked: false,
      approvalStatus: 'UNLOCKED'
    }
  });

  res.status(200).json({ success: true, data: updatedPlan, message: 'Plan unlocked for member edit successfully' });
});

// ---- 9. MEETING NOTES ENGINE ----
export const getMeetingNotes = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, sectionId } = req.query;
  const where: any = {};
  if (teamId) where.teamId = teamId as string;
  if (sectionId) where.sectionId = sectionId as string;

  const notes = await prisma.dailyMeetingNote.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: notes });
});

export const createMeetingNote = asyncHandler(async (req: any, res: Response) => {
  const { teamId, sectionId, todayFocus, customerVisit, machineBreakdown, safetyAlert, priorityProjects, specialInstructions, actionItems, attachmentUrl } = req.body;

  if (!todayFocus || !todayFocus.trim()) {
    return res.status(400).json({ success: false, message: 'Today Focus is required for meeting notes' });
  }

  const note = await prisma.dailyMeetingNote.create({
    data: {
      teamId,
      sectionId,
      todayFocus: todayFocus.trim(),
      customerVisit,
      machineBreakdown,
      safetyAlert,
      priorityProjects,
      specialInstructions,
      actionItems,
      attachmentUrl,
      createdById: req.user.id
    },
    include: {
      createdBy: { select: { id: true, name: true } }
    }
  });

  res.status(201).json({ success: true, data: note, message: 'Meeting notes published to team dashboard successfully!' });
});

// ---- 10. DEPARTMENT HEAD DASHBOARD METRICS API ----
export const getDepartmentDashboardMetrics = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalActiveUsers, plansCount, closingsCount, carryForwardCount, delayedCount, blockedCount, activeSupportCount, attendanceCount] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.dailyPlan.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.dailyClosing.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.task.count({ where: { carryForwardCount: { gt: 0 } } }),
    prisma.task.count({ where: { status: 'DELAYED' } }),
    prisma.task.count({ where: { status: 'BLOCKED' } }),
    prisma.dailyPlan.count({ where: { supportRequired: { not: null }, date: { gte: today, lt: tomorrow } } }),
    prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'PRESENT' } })
  ]);

  const planningRatio = totalActiveUsers > 0 ? Math.round((plansCount / totalActiveUsers) * 100) : 0;
  const closingRatio = totalActiveUsers > 0 ? Math.round((closingsCount / totalActiveUsers) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      totalActiveUsers,
      planningSubmissions: `${plansCount} / ${totalActiveUsers}`,
      closingSubmissions: `${closingsCount} / ${totalActiveUsers}`,
      planningRatio,
      closingRatio,
      carryForwardCount,
      delayedTasksCount: delayedCount,
      blockedTasksCount: blockedCount,
      activeSupportRequestsCount: activeSupportCount,
      attendanceRate: totalActiveUsers > 0 ? Math.round((attendanceCount / totalActiveUsers) * 100) : 100,
      departmentHealth: blockedCount > 5 ? 'OFF_TRACK' : blockedCount > 2 ? 'AT_RISK' : 'ON_TRACK'
    }
  });
});

// Admin ONLY: Get ALL daily plans for today
export const getAllDailyPlansLive = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plans = await prisma.dailyPlan.findMany({
    where: {
      date: { gte: today, lt: tomorrow }
    },
    include: {
      user: { select: { id: true, name: true, employeeId: true, role: true, designation: true } },
      projects: { select: { id: true, name: true, drsRequestId: true } },
      tasks: { select: { id: true, title: true, status: true, priority: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: plans });
});
