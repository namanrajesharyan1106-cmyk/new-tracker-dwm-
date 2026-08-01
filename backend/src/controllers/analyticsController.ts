import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// ---- 1. EXECUTIVE MANAGEMENT DASHBOARD METRICS ----
export const getExecutiveDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    delayedProjects,
    blockedProjects,
    totalTasks,
    completedTasks,
    delayedTasks,
    blockedTasks,
    activeUsers,
    plansToday,
    closingsToday,
    attendanceToday,
    carryForwardTasks,
    supportRequestsCount
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
    prisma.project.count({ where: { status: 'DELAYED' } }),
    prisma.project.count({ where: { status: 'ON_HOLD' } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({ where: { status: 'DELAYED' } }),
    prisma.task.count({ where: { status: 'BLOCKED' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.dailyPlan.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.dailyClosing.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'PRESENT' } }),
    prisma.task.count({ where: { carryForwardCount: { gt: 0 } } }),
    prisma.dailyPlan.count({ where: { supportRequired: { not: null }, date: { gte: today, lt: tomorrow } } })
  ]);

  const planningComplianceRatio = activeUsers > 0 ? Math.round((plansToday / activeUsers) * 100) : 0;
  const closingComplianceRatio = activeUsers > 0 ? Math.round((closingsToday / activeUsers) * 100) : 0;
  const overallProductivityRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const attendanceRatio = activeUsers > 0 ? Math.round((attendanceToday / activeUsers) * 100) : 100;

  const departmentHealth = blockedTasks > 5 ? 'OFF_TRACK' : delayedTasks > 5 ? 'AT_RISK' : 'ON_TRACK';

  res.status(200).json({
    success: true,
    data: {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        delayed: delayedProjects,
        blocked: blockedProjects
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        delayed: delayedTasks,
        blocked: blockedTasks
      },
      compliance: {
        activeUsers,
        planningComplianceRatio,
        closingComplianceRatio,
        overallProductivityRatio,
        attendanceRatio,
        carryForwardCount: carryForwardTasks,
        supportRequestsCount
      },
      departmentHealth
    }
  });
});

// ---- 2. PROJECT ANALYTICS & FORECAST ENGINE ----
export const getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    include: {
      activities: {
        include: {
          tasks: { select: { id: true, status: true, estimatedHours: true, actualHours: true, progress: true } }
        }
      },
      teams: { select: { team: { select: { id: true, name: true } } } }
    }
  });

  const projectAnalytics = projects.map(p => {
    const allTasks = p.activities.flatMap(a => a.tasks);
    const totalEstHours = allTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActHours = allTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const completedCount = allTasks.filter(t => t.status === 'COMPLETED').length;
    const delayedCount = allTasks.filter(t => t.status === 'DELAYED').length;
    const blockedCount = allTasks.filter(t => t.status === 'BLOCKED').length;

    const progressPct = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
    const variancePct = totalEstHours > 0 ? Math.round(((totalActHours - totalEstHours) / totalEstHours) * 100) : 0;

    // Forecast Completion Date
    const remainingTasks = allTasks.length - completedCount;
    const estimatedDaysLeft = Math.ceil(remainingTasks * 1.5);
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + estimatedDaysLeft);

    const health = blockedCount > 0 ? 'BLOCKED' : delayedCount > 0 ? 'AT_RISK' : 'ON_TRACK';

    return {
      id: p.id,
      name: p.name,
      drsRequestId: p.drsRequestId,
      progressPct,
      variancePct,
      estimatedHours: totalEstHours,
      actualHours: totalActHours,
      tasksCount: allTasks.length,
      completedCount,
      delayedCount,
      blockedCount,
      forecastDate,
      health
    };
  });

  res.status(200).json({ success: true, data: projectAnalytics });
});

// ---- 3. EMPLOYEE LEADERBOARDS & PERFORMANCE ANALYTICS ----
export const getEmployeeLeaderboards = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      employeeId: true,
      designation: true,
      role: true,
      assignedTasks: { select: { id: true, status: true, carryForwardCount: true } }
    }
  });

  const leaderboards = await Promise.all(
    users.map(async u => {
      const [closings, workLogs] = await Promise.all([
        prisma.dailyClosing.findMany({ where: { userId: u.id }, select: { productivityScore: true } }),
        prisma.taskWorkLog.findMany({ where: { userId: u.id }, select: { hoursWorked: true } })
      ]);

      const totalTasks = u.assignedTasks.length;
      const completed = u.assignedTasks.filter(t => t.status === 'COMPLETED').length;
      const carryForwardCount = u.assignedTasks.reduce((sum, t) => sum + (t.carryForwardCount || 0), 0);
      const totalHoursWorked = workLogs.reduce((sum, log) => sum + log.hoursWorked, 0);

      const avgProductivityScore = closings.length > 0
        ? Math.round(closings.reduce((sum, c) => sum + (c.productivityScore || 0), 0) / closings.length)
        : 100;

      return {
        user: u,
        totalTasks,
        completedTasks: completed,
        carryForwardCount,
        totalHoursWorked,
        productivityScore: avgProductivityScore
      };
    })
  );

  leaderboards.sort((a, b) => b.productivityScore - a.productivityScore);

  res.status(200).json({
    success: true,
    data: {
      topPerformers: leaderboards.slice(0, 10),
      highestCarryForward: [...leaderboards].sort((a, b) => b.carryForwardCount - a.carryForwardCount).slice(0, 10)
    }
  });
});

// ---- 4. REPORT EXPORT ENGINE DATA ----
export const getReportData = asyncHandler(async (req: Request, res: Response) => {
  const { reportType } = req.query; // 'DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT', 'EMPLOYEE'

  if (reportType === 'PROJECT') {
    const data = await prisma.project.findMany({
      include: {
        activities: { include: { tasks: true } }
      }
    });
    return res.status(200).json({ success: true, data });
  }

  if (reportType === 'EMPLOYEE') {
    const data = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employeeId: true,
        role: true,
        dailyPlans: { take: 5 },
        dailyClosings: { take: 5 }
      }
    });
    return res.status(200).json({ success: true, data });
  }

  const tasksData = await prisma.task.findMany({
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, employeeId: true } }
    },
    take: 100,
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: tasksData });
});
