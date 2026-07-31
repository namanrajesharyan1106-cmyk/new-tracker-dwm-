import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// Get current user's daily plan for today
export const getMyDailyPlan = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plan = await prisma.dailyPlan.findFirst({
    where: {
      userId: req.user.id,
      date: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      projects: true,
      tasks: true
    }
  });

  res.status(200).json({ success: true, data: plan });
});

// Create or Update user's daily plan for today
export const updateMyDailyPlan = asyncHandler(async (req: any, res: Response) => {
  const { planText, projectIds, taskIds } = req.body;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find existing plan for today
  let plan = await prisma.dailyPlan.findFirst({
    where: {
      userId: req.user.id,
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  if (plan) {
    // Update existing plan using implicit many-to-many relationship
    plan = await prisma.dailyPlan.update({
      where: { id: plan.id },
      data: {
        planText: planText || '',
        projects: {
          set: (projectIds || []).map((id: string) => ({ id }))
        },
        tasks: {
          set: (taskIds || []).map((id: string) => ({ id }))
        }
      },
      include: { projects: true, tasks: true }
    });
  } else {
    // Create new plan for today
    plan = await prisma.dailyPlan.create({
      data: {
        userId: req.user.id,
        date: new Date(),
        planText: planText || '',
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

  res.status(200).json({ success: true, data: plan });
});

// Admin ONLY: Get ALL daily plans for today
export const getAllDailyPlansLive = asyncHandler(async (req: any, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plans = await prisma.dailyPlan.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      }
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
