import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

export const FIXED_STAGES = [
  { name: 'Discovery', purpose: 'Understand business problem, users and objectives.' },
  { name: 'Requirements Analysis', purpose: 'Document functional and technical requirements.' },
  { name: 'Solution Design', purpose: 'Architecture, Workflow, Database, APIs and UI/UX.' },
  { name: 'Development', purpose: 'Implementation and coding.' },
  { name: 'Testing / Quality Assurance (QA)', purpose: 'Testing and bug fixing.' },
  { name: 'User Acceptance Testing (UAT)', purpose: 'Business validation.' },
  { name: 'Deployment / Go Live', purpose: 'Production release.' },
  { name: 'Support & Maintenance', purpose: 'Post production improvements.' }
];

// ---- AUTOMATIC REQUIREMENT PROGRESS ENGINE ----
export const updateRequirementProgressCascade = async (requirementId: string) => {
  const tasks = await prisma.task.findMany({
    where: { requirementId },
    select: { progress: true, stageName: true }
  });

  if (tasks.length === 0) return;

  // Calculate Stage Progress for each of 8 Fixed Stages
  const stageProgressList = FIXED_STAGES.map(s => {
    const stageTasks = tasks.filter(t => t.stageName === s.name);
    if (stageTasks.length === 0) return 0;
    const stageSum = stageTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    return Math.round(stageSum / stageTasks.length);
  });

  // Requirement Progress = Average Progress of all 8 Fixed Stages
  const overallAvg = Math.round(stageProgressList.reduce((sum, p) => sum + p, 0) / FIXED_STAGES.length);

  await prisma.requirement.update({
    where: { id: requirementId },
    data: {
      progress: overallAvg,
      status: overallAvg === 100 ? 'COMPLETED' : overallAvg > 0 ? 'IN_EXECUTION' : 'APPROVED'
    }
  });
};

// ---- GET PUBLISHED & APPROVED REQUIREMENTS (DOPS EXECUTION WORKSPACE - READ ONLY) ----
export const getRequirements = asyncHandler(async (req: Request, res: Response) => {
  const requirements = await prisma.requirement.findMany({
    where: {
      status: { in: ['APPROVED', 'IN_EXECUTION', 'PUBLISHED', 'COMPLETED'] }
    },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          progress: true,
          stageName: true,
          assignedTo: { select: { id: true, name: true, employeeId: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: requirements });
});

// ---- GET REQUIREMENT CHARTER DETAILS (WITH 8 FIXED STAGES) ----
export const getRequirementDetails = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true, employeeId: true, role: true } },
          createdBy: { select: { id: true, name: true } },
          workLogs: { orderBy: { createdAt: 'desc' } }
        }
      }
    }
  });

  if (!requirement) {
    return res.status(404).json({ success: false, message: 'Requirement charter not found' });
  }

  // Structure tasks under 8 Fixed Execution Stages
  const stages = FIXED_STAGES.map(s => {
    const stageTasks = requirement.tasks.filter(t => t.stageName === s.name);
    const progress = stageTasks.length > 0
      ? Math.round(stageTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / stageTasks.length)
      : 0;

    return {
      ...s,
      progress,
      tasks: stageTasks
    };
  });

  res.status(200).json({
    success: true,
    data: {
      ...requirement,
      stages
    }
  });
});

// ---- ASSIGN TEAM & MEMBERS FOR REQUIREMENT EXECUTION (DOPS EXECUTION ASSIGNMENT) ----
export const assignRequirementTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { assignedTeams, assignedMembers } = req.body;

  if (!assignedTeams || !Array.isArray(assignedTeams) || assignedTeams.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one team must be selected.' });
  }

  const requirement = await prisma.requirement.update({
    where: { id },
    data: {
      assignedTeams: JSON.stringify(assignedTeams),
      assignedMembers: assignedMembers ? JSON.stringify(assignedMembers) : JSON.stringify([]),
      executionStatus: 'Execution Started'
    }
  });

  res.status(200).json({
    success: true,
    data: requirement,
    message: 'Team execution assigned and status updated to Execution Started'
  });
});
