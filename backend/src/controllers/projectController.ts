import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// GET ALL PROJECTS WITH HEALTH & METRICS
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    include: {
      section: { select: { id: true, name: true } },
      teams: { include: { team: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true } },
      tasks: {
        select: { id: true, status: true, progress: true, type: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Dynamically calculate actual progress & health
  const formattedProjects = projects.map(proj => {
    const totalTasks = proj.tasks.length;
    const completedTasks = proj.tasks.filter(t => t.status === 'COMPLETED').length;
    const actualProgress = totalTasks > 0 
      ? Math.round(proj.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks) 
      : proj.progress;
      
    const delayedTasksCount = proj.tasks.filter(t => t.status === 'DELAYED' || t.status === 'BLOCKED').length;
    let health = 'ON_TRACK';
    if (delayedTasksCount > 2) health = 'OFF_TRACK';
    else if (delayedTasksCount > 0) health = 'AT_RISK';

    const variance = actualProgress - (proj.plannedProgress || 0);

    return {
      ...proj,
      progress: actualProgress,
      variance,
      health,
      completedTasksCount: completedTasks,
      totalTasksCount: totalTasks,
      teams: proj.teams.map(t => t.team)
    };
  });

  res.status(200).json({ success: true, data: formattedProjects });
});

// AUTO-CONVERT APPROVED DRS REQUEST INTO OPERATIONS PROJECT
export const syncDrsRequest = asyncHandler(async (req: any, res: Response) => {
  const { drsRequestId, title, plant, priority, sectionId, targetDate, description, sponsor, manager, budget, customer } = req.body;

  if (!drsRequestId || !title) {
    return res.status(400).json({ success: false, message: 'drsRequestId and title are required' });
  }

  // Check if project already exists for this DRS Request
  const existingProject = await prisma.project.findUnique({
    where: { drsRequestId }
  });

  if (existingProject) {
    return res.status(200).json({
      success: true,
      data: existingProject,
      message: 'Project already exists in Operations for this DRS Request.'
    });
  }

  const newProject = await prisma.project.create({
    data: {
      name: title,
      description,
      drsRequestId,
      plant: plant || 'Main Plant',
      priority: priority || 'MEDIUM',
      status: 'IN_PROGRESS',
      startDate: new Date(),
      targetDate: targetDate ? new Date(targetDate) : null,
      sponsor,
      manager,
      budget: budget ? parseFloat(budget) : null,
      customer,
      sectionId
    }
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DRS_REQUEST_APPROVED_TO_PROJECT',
      entity: 'Project',
      entityId: newProject.id,
      details: JSON.stringify({ drsRequestId, name: title })
    }
  });

  res.status(201).json({
    success: true,
    data: newProject,
    message: 'DRS Request approved and converted into Operations Project successfully!'
  });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, drsRequestId, plant, priority, sectionId, targetDate, sponsor, manager, budget, customer } = req.body;
  
  if (drsRequestId) {
    const existing = await prisma.project.findUnique({ where: { drsRequestId } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Project with DRS ID ${drsRequestId} already exists` });
    }
  }

  const project = await prisma.project.create({
    data: { 
      name, 
      description,
      drsRequestId: drsRequestId || null, 
      plant, 
      priority: priority || 'MEDIUM', 
      sectionId, 
      status: 'NOT_STARTED',
      targetDate: targetDate ? new Date(targetDate) : null,
      sponsor,
      manager,
      budget: budget ? parseFloat(budget) : null,
      customer
    },
  });

  res.status(201).json({ success: true, data: project });
});

// GET SINGLE PROJECT DETAILS (Tasks breakdown by type: Milestones, Activities, Tasks)
export const getProjectDetails = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      section: { select: { id: true, name: true } },
      teams: { include: { team: { select: { id: true, name: true } } } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          subtasks: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const formattedProject = {
    ...project,
    teams: project.teams.map(t => t.team)
  };

  res.status(200).json({ success: true, data: formattedProject });
});

// ASSIGN TEAMS TO PROJECT (Many-to-Many)
export const assignProjectTeams = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { teamIds } = req.body;

  if (!teamIds || !Array.isArray(teamIds)) {
    return res.status(400).json({ success: false, message: 'teamIds must be an array' });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  await prisma.$transaction([
    prisma.projectTeamMapping.deleteMany({ where: { projectId: id } }),
    prisma.projectTeamMapping.createMany({
      data: teamIds.map((teamId: string) => ({ projectId: id, teamId }))
    })
  ]);

  res.status(200).json({ success: true, message: 'Project team assignments updated successfully' });
});

