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

  // Dispatch Notifications to Team Lead and Manager for Evening Closing
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { teams: true, sections: true }
    });

    const userTeamIds = currentUser?.teams.map(t => t.teamId) || [];
    const userSectionIds = currentUser?.sections.map(s => s.sectionId) || [];

    const [teamLeads, managers] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'TEAM_LEAD',
          teams: { some: { teamId: { in: userTeamIds } } },
          id: { not: userId }
        },
        select: { id: true }
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['DEPARTMENT_ADMIN', 'SUPER_ADMIN'] },
          OR: [
            { teams: { some: { teamId: { in: userTeamIds } } } },
            { sections: { some: { sectionId: { in: userSectionIds } } } }
          ],
          id: { not: userId }
        },
        select: { id: true }
      })
    ]);

    const notifications = [
      ...teamLeads.map(tl => ({
        userId: tl.id,
        title: 'Evening Closing Received',
        message: `Evening Closing received from ${currentUser?.name || 'team member'}.`,
        entityType: 'DailyClosing',
        entityId: closing.id
      })),
      ...managers.map(m => ({
        userId: m.id,
        title: 'Evening Closing Submitted',
        message: `${currentUser?.name || 'An employee'} has submitted today's Evening Closing.`,
        entityType: 'DailyClosing',
        entityId: closing.id
      }))
    ];

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (notifErr) {
    console.error('Failed to dispatch notifications for evening closing:', notifErr);
  }

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
  const currentUser = req.user;
  const userRole = currentUser.role || 'TEAM_MEMBER';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Fetch current user mappings for role-based scoping
  const userTeamMappings = await prisma.userTeamMapping.findMany({
    where: { userId: currentUser.id },
    select: { teamId: true }
  });
  const userTeamIds = userTeamMappings.map(t => t.teamId);

  const userSectionMappings = await prisma.userSectionMapping.findMany({
    where: { userId: currentUser.id },
    select: { sectionId: true }
  });
  const userSectionIds = userSectionMappings.map(s => s.sectionId);

  const memberWhere: any = { isActive: true };

  // Strict Role Visibility Matrix
  if (userRole === 'TEAM_MEMBER') {
    memberWhere.id = currentUser.id;
  } else if (userRole === 'TEAM_LEAD') {
    if (teamId && userTeamIds.includes(teamId as string)) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else {
      memberWhere.teams = { some: { teamId: { in: userTeamIds } } };
    }
  } else if (userRole === 'DEPARTMENT_ADMIN') {
    if (teamId) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else if (sectionId) {
      memberWhere.sections = { some: { sectionId: sectionId as string } };
    } else if (userTeamIds.length > 0 || userSectionIds.length > 0) {
      memberWhere.OR = [
        { teams: { some: { teamId: { in: userTeamIds } } } },
        { sections: { some: { sectionId: { in: userSectionIds } } } }
      ];
    }
  } else if (userRole === 'SUPER_ADMIN') {
    if (teamId) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else if (sectionId) {
      memberWhere.sections = { some: { sectionId: sectionId as string } };
    }
  }

  if (search) {
    memberWhere.AND = [
      {
        OR: [
          { name: { contains: search } },
          { employeeId: { contains: search } }
        ]
      }
    ];
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
        prisma.dailyPlan.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { tasks: true, projects: true } }),
        prisma.dailyClosing.findFirst({ where: { userId: m.id, date: { gte: yesterday, lt: today } } }),
        prisma.task.findMany({ where: { assignedToId: m.id, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } } }),
        prisma.task.findMany({ where: { assignedToId: m.id, status: 'BLOCKED' }, select: { title: true, blockReason: true } }),
        prisma.task.count({ where: { assignedToId: m.id, carryForwardCount: { gt: 0 } } })
      ]);

      const yesterdayCompleted = yesterdayClosing?.completedTaskIds ? yesterdayClosing.completedTaskIds.split(',').length : 0;
      const isSubmitted = !!todayPlan?.isSubmitted;

      return {
        member: m,
        attendanceStatus: todayAttendance?.status || 'PRESENT',
        yesterdaySummary: `${yesterdayCompleted} Tasks Completed`,
        todayPlanStatus: isSubmitted ? 'SUBMITTED' : 'PENDING',
        approvalStatus: todayPlan?.approvalStatus || 'PENDING_APPROVAL',
        planId: todayPlan?.id || null,
        submittedAt: todayPlan?.createdAt || null,
        isLocked: todayPlan?.isLocked || false,
        plannedTasksCount: todayPlan?.tasks?.length || activeTasks.length,
        plannedTasks: (todayPlan?.tasks && todayPlan.tasks.length > 0) 
          ? todayPlan.tasks 
          : activeTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status })),
        topPriorities: todayPlan?.topPriorities || todayPlan?.planText || 'No priorities entered',
        notes: todayPlan?.strategy || todayPlan?.remarks || null,
        supportRequired: todayPlan?.supportRequired || null,
        blockedTasks,
        carryForwardCount
      };
    })
  );

  res.status(200).json({ success: true, data: memberSummaries });
});

// ---- 6.5 TEAM EVENING CLOSING VIEW API ----
export const getTeamEveningClosingView = asyncHandler(async (req: any, res: Response) => {
  const { teamId, sectionId, search } = req.query;
  const currentUser = req.user;
  const userRole = currentUser.role || 'TEAM_MEMBER';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const userTeamMappings = await prisma.userTeamMapping.findMany({
    where: { userId: currentUser.id },
    select: { teamId: true }
  });
  const userTeamIds = userTeamMappings.map(t => t.teamId);

  const userSectionMappings = await prisma.userSectionMapping.findMany({
    where: { userId: currentUser.id },
    select: { sectionId: true }
  });
  const userSectionIds = userSectionMappings.map(s => s.sectionId);

  const memberWhere: any = { isActive: true };

  // Role Visibility Matrix Scoping
  if (userRole === 'TEAM_MEMBER') {
    memberWhere.id = currentUser.id;
  } else if (userRole === 'TEAM_LEAD') {
    if (teamId && userTeamIds.includes(teamId as string)) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else {
      memberWhere.teams = { some: { teamId: { in: userTeamIds } } };
    }
  } else if (userRole === 'DEPARTMENT_ADMIN') {
    if (teamId) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else if (sectionId) {
      memberWhere.sections = { some: { sectionId: sectionId as string } };
    } else if (userTeamIds.length > 0 || userSectionIds.length > 0) {
      memberWhere.OR = [
        { teams: { some: { teamId: { in: userTeamIds } } } },
        { sections: { some: { sectionId: { in: userSectionIds } } } }
      ];
    }
  } else if (userRole === 'SUPER_ADMIN') {
    if (teamId) {
      memberWhere.teams = { some: { teamId: teamId as string } };
    } else if (sectionId) {
      memberWhere.sections = { some: { sectionId: sectionId as string } };
    }
  }

  if (search) {
    memberWhere.AND = [
      {
        OR: [
          { name: { contains: search } },
          { employeeId: { contains: search } }
        ]
      }
    ];
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
      const [todayAttendance, todayPlan, todayClosing, workLogs, assignedTasks] = await Promise.all([
        prisma.attendance.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } } }),
        prisma.dailyPlan.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { tasks: true } }),
        prisma.dailyClosing.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { reviewHistory: { include: { reviewer: { select: { name: true } } } } } }),
        prisma.taskWorkLog.findMany({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { task: { select: { id: true, title: true } } } }),
        prisma.task.findMany({ where: { assignedToId: m.id } })
      ]);

      const isSubmitted = !!todayClosing?.isSubmitted;
      const completedTaskIds = todayClosing?.completedTaskIds ? todayClosing.completedTaskIds.split(',').filter(Boolean) : [];
      const pendingTaskIds = todayClosing?.pendingTaskIds ? todayClosing.pendingTaskIds.split(',').filter(Boolean) : [];
      const delayedTaskIds = todayClosing?.delayedTaskIds ? todayClosing.delayedTaskIds.split(',').filter(Boolean) : [];
      const blockedTaskIds = todayClosing?.blockedTaskIds ? todayClosing.blockedTaskIds.split(',').filter(Boolean) : [];

      const completedTasks = assignedTasks.filter(t => completedTaskIds.includes(t.id) || t.status === 'COMPLETED');
      const pendingTasks = assignedTasks.filter(t => pendingTaskIds.includes(t.id) || (t.status !== 'COMPLETED' && t.status !== 'DELAYED' && t.status !== 'BLOCKED'));
      const delayedTasks = assignedTasks.filter(t => delayedTaskIds.includes(t.id) || t.status === 'DELAYED');
      const blockedTasks = assignedTasks.filter(t => blockedTaskIds.includes(t.id) || t.status === 'BLOCKED');

      const totalActualHours = workLogs.reduce((sum, w) => sum + w.hoursWorked, 0);

      return {
        member: m,
        attendanceStatus: todayAttendance?.status || 'PRESENT',
        todayClosingStatus: isSubmitted ? 'SUBMITTED' : 'PENDING',
        closingId: todayClosing?.id || null,
        submittedAt: todayClosing?.createdAt || null,
        closingText: todayClosing?.closingText || '',
        achievements: todayClosing?.achievements || null,
        problemsFaced: todayClosing?.problemsFaced || null,
        tomorrowPriority: todayClosing?.tomorrowPriority || null,
        supportRequired: todayClosing?.supportRequired || null,
        actualHoursWorked: todayClosing?.actualHoursWorked || totalActualHours,
        productivityScore: todayClosing?.productivityScore || (completedTasks.length > 0 ? 100 : 0),
        reviewStatus: todayClosing?.reviewStatus || 'PENDING_REVIEW',
        reviewerId: todayClosing?.reviewerId || null,
        reviewedAt: todayClosing?.reviewedAt || null,
        managerRemarks: todayClosing?.managerRemarks || null,
        reviewHistory: todayClosing?.reviewHistory || [],
        completedTasks: completedTasks.map(t => ({ id: t.id, title: t.title })),
        pendingTasks: pendingTasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
        delayedTasks: delayedTasks.map(t => ({ id: t.id, title: t.title, delayReason: t.delayReason })),
        blockedTasks: blockedTasks.map(t => ({ id: t.id, title: t.title, blockReason: t.blockReason })),
        workLogs: workLogs.map(w => ({ id: w.id, taskTitle: w.task.title, hoursWorked: w.hoursWorked, summary: w.workSummary }))
      };
    })
  );

  res.status(200).json({ success: true, data: memberSummaries });
});

// ---- 6.6 MANAGER REVIEW ON EVENING CLOSING ----
export const reviewDailyClosing = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const reviewerId = req.user.id;

  const validStatuses = ['APPROVED', 'NEEDS_DISCUSSION', 'REQUIRES_SUPPORT', 'CARRY_FORWARD_REQUIRED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid review status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  if (!['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_LEAD'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only Team Leads and Managers can review evening closings.'
    });
  }

  const closing = await prisma.dailyClosing.findUnique({ where: { id } });
  if (!closing) {
    return res.status(404).json({ success: false, message: 'Evening Closing record not found' });
  }

  const updatedClosing = await prisma.dailyClosing.update({
    where: { id },
    data: {
      reviewStatus: status,
      reviewerId,
      reviewedAt: new Date(),
      managerRemarks: remarks || null
    }
  });

  await prisma.dailyClosingReviewHistory.create({
    data: {
      dailyClosingId: id,
      reviewerId,
      status,
      remarks: remarks || null
    }
  });

  res.status(200).json({
    success: true,
    data: updatedClosing,
    message: `Evening Closing review set to ${status.replace('_', ' ')}`
  });
});

// ---- 6.7 PLANNED vs ACTUAL REPORT API ----
export const getPlannedVsActualReport = asyncHandler(async (req: any, res: Response) => {
  const { teamId, sectionId } = req.query;
  const currentUser = req.user;
  const userRole = currentUser.role || 'TEAM_MEMBER';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const userTeamMappings = await prisma.userTeamMapping.findMany({
    where: { userId: currentUser.id },
    select: { teamId: true }
  });
  const userTeamIds = userTeamMappings.map(t => t.teamId);

  const userSectionMappings = await prisma.userSectionMapping.findMany({
    where: { userId: currentUser.id },
    select: { sectionId: true }
  });
  const userSectionIds = userSectionMappings.map(s => s.sectionId);

  const memberWhere: any = { isActive: true };

  if (userRole === 'TEAM_MEMBER') {
    memberWhere.id = currentUser.id;
  } else if (userRole === 'TEAM_LEAD') {
    memberWhere.teams = { some: { teamId: { in: userTeamIds } } };
  } else if (userRole === 'DEPARTMENT_ADMIN') {
    if (teamId) memberWhere.teams = { some: { teamId: teamId as string } };
    else if (sectionId) memberWhere.sections = { some: { sectionId: sectionId as string } };
    else if (userTeamIds.length > 0 || userSectionIds.length > 0) {
      memberWhere.OR = [
        { teams: { some: { teamId: { in: userTeamIds } } } },
        { sections: { some: { sectionId: { in: userSectionIds } } } }
      ];
    }
  }

  const members = await prisma.user.findMany({
    where: memberWhere,
    select: { id: true, name: true, employeeId: true, role: true }
  });

  const memberReports = await Promise.all(
    members.map(async m => {
      const [plan, closing, workLogs] = await Promise.all([
        prisma.dailyPlan.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { tasks: true } }),
        prisma.dailyClosing.findFirst({ where: { userId: m.id, date: { gte: today, lt: tomorrow } } }),
        prisma.taskWorkLog.findMany({ where: { userId: m.id, date: { gte: today, lt: tomorrow } }, include: { task: { select: { id: true, title: true, status: true } } } })
      ]);

      const plannedTaskIds = (plan?.tasks || []).map(t => t.id);
      const plannedHours = plan?.expectedHours || 8.0;
      const actualHours = workLogs.reduce((sum, w) => sum + w.hoursWorked, 0);

      const loggedTaskIds = workLogs.map(w => w.taskId);
      const completedTasks = workLogs.filter(w => w.task.status === 'COMPLETED');
      const extraTasks = workLogs.filter(w => !plannedTaskIds.includes(w.taskId));

      const plannedTasksCount = plannedTaskIds.length;
      const completedCount = completedTasks.length;
      const pendingCount = Math.max(0, plannedTasksCount - completedCount);
      const extraCount = extraTasks.length;

      const productivity = plannedTasksCount > 0 
        ? Math.round((completedCount / plannedTasksCount) * 100) 
        : (closing?.productivityScore || 100);

      return {
        member: m,
        plannedTasksCount,
        completedTasksCount: completedCount,
        pendingTasksCount: pendingCount,
        extraTasksCount: extraCount,
        plannedHours,
        actualHours,
        delayHours: Math.max(0, actualHours - plannedHours),
        productivity,
        morningSubmitted: !!plan?.isSubmitted,
        closingSubmitted: !!closing?.isSubmitted
      };
    })
  );

  const totalPlannedHours = memberReports.reduce((s, r) => s + r.plannedHours, 0);
  const totalActualHours = memberReports.reduce((s, r) => s + r.actualHours, 0);
  const avgProductivity = memberReports.length > 0 
    ? Math.round(memberReports.reduce((s, r) => s + r.productivity, 0) / memberReports.length)
    : 100;

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalMembers: members.length,
        totalPlannedHours,
        totalActualHours,
        avgProductivity
      },
      memberReports
    }
  });
});

// ---- 6.8 SUPER ADMIN OPERATIONS OVERVIEW API ----
export const getSuperAdminOperationsOverview = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalActiveUsers, morningSubmitted, closingSubmitted, delayedCount, blockedCount] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.dailyPlan.count({ where: { date: { gte: today, lt: tomorrow }, isSubmitted: true } }),
    prisma.dailyClosing.count({ where: { date: { gte: today, lt: tomorrow }, isSubmitted: true } }),
    prisma.task.count({ where: { status: 'DELAYED' } }),
    prisma.task.count({ where: { status: 'BLOCKED' } })
  ]);

  res.status(200).json({
    success: true,
    data: {
      morningPlanning: {
        submitted: morningSubmitted,
        pending: Math.max(0, totalActiveUsers - morningSubmitted)
      },
      eveningClosing: {
        submitted: closingSubmitted,
        pending: Math.max(0, totalActiveUsers - closingSubmitted)
      },
      delayedTasks: delayedCount,
      blockedTasks: blockedCount,
      totalActiveUsers
    }
  });
});

// ---- 7. TEAM LEAD APPROVAL & LOCK WORKFLOW ----
export const approveOrRejectDailyPlan = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { action, comments } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEPARTMENT_ADMIN' && req.user.role !== 'TEAM_LEAD') {
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

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEPARTMENT_ADMIN' && req.user.role !== 'TEAM_LEAD') {
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

// Admin / Manager / Team Lead: Get live daily plans scoped by role
export const getAllDailyPlansLive = asyncHandler(async (req: any, res: Response) => {
  const currentUser = req.user;
  const userRole = currentUser.role || 'TEAM_MEMBER';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const planWhere: any = {
    date: { gte: today, lt: tomorrow }
  };

  if (userRole === 'TEAM_MEMBER') {
    planWhere.userId = currentUser.id;
  } else if (userRole === 'TEAM_LEAD') {
    const userTeams = await prisma.userTeamMapping.findMany({
      where: { userId: currentUser.id },
      select: { teamId: true }
    });
    const teamIds = userTeams.map(t => t.teamId);
    planWhere.user = { teams: { some: { teamId: { in: teamIds } } } };
  } else if (userRole === 'DEPARTMENT_ADMIN') {
    const userTeams = await prisma.userTeamMapping.findMany({
      where: { userId: currentUser.id },
      select: { teamId: true }
    });
    const userSections = await prisma.userSectionMapping.findMany({
      where: { userId: currentUser.id },
      select: { sectionId: true }
    });
    const teamIds = userTeams.map(t => t.teamId);
    const sectionIds = userSections.map(s => s.sectionId);

    if (teamIds.length > 0 || sectionIds.length > 0) {
      planWhere.user = {
        OR: [
          { teams: { some: { teamId: { in: teamIds } } } },
          { sections: { some: { sectionId: { in: sectionIds } } } }
        ]
      };
    }
  }

  const plans = await prisma.dailyPlan.findMany({
    where: planWhere,
    include: {
      user: { select: { id: true, name: true, employeeId: true, role: true, designation: true } },
      projects: { select: { id: true, name: true, drsRequestId: true } },
      tasks: { select: { id: true, title: true, status: true, priority: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: plans });
});
