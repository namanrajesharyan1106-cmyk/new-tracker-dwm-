import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';
import bcrypt from 'bcryptjs';

// ---- TREE DATA ----

export const getTreeData = asyncHandler(async (req: Request, res: Response) => {
  const sections = await prisma.section.findMany({
    include: {
      teams: {
        include: {
          users: {
            include: {
              user: {
                select: { 
                  id: true, employeeId: true, name: true, email: true, mobile: true, 
                  role: true, designation: true, isApproved: true, isActive: true 
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Re-map to flatten user mapping for simpler frontend usage
  const formattedTree = sections.map(section => ({
    id: section.id,
    name: section.name,
    teams: section.teams.map(team => ({
      id: team.id,
      name: team.name,
      users: team.users.map(u => u.user)
    }))
  }));

  res.status(200).json({ success: true, data: formattedTree });
});

// ---- SECTIONS ----

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const section = await prisma.section.create({
    data: { name, description },
  });
  res.status(201).json({ success: true, data: section });
});

export const getSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await prisma.section.findMany({
    include: { _count: { select: { teams: true, users: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: sections });
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const section = await prisma.section.update({
    where: { id },
    data: { name, description },
  });
  res.status(200).json({ success: true, data: section });
});

export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.section.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Section deleted successfully' });
});

// ---- TEAMS ----

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, sectionId } = req.body;
  const team = await prisma.team.create({
    data: { name, description, sectionId },
    include: { section: true }
  });
  res.status(201).json({ success: true, data: team });
});

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const sectionId = req.query.sectionId as string;
  const where = sectionId ? { sectionId } : {};

  const teams = await prisma.team.findMany({
    where,
    include: { section: true, _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: teams });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, sectionId } = req.body;
  const team = await prisma.team.update({
    where: { id },
    data: { name, description, sectionId },
    include: { section: true }
  });
  res.status(200).json({ success: true, data: team });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.team.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Team deleted successfully' });
});

// ---- USERS & MAPPINGS ----

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, employeeId: true, name: true, email: true, mobile: true, role: true, 
      designation: true, isApproved: true, isActive: true, createdAt: true,
      sections: { include: { section: { select: { id: true, name: true } } } },
      teams: { include: { team: { select: { id: true, name: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedUsers = users.map(user => ({
    ...user,
    sections: user.sections.map(s => s.section),
    teams: user.teams.map(t => t.team),
  }));

  res.status(200).json({ success: true, data: formattedUsers });
});

export const getUserStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const [tasksCount, projectsCount] = await Promise.all([
    prisma.task.count({ where: { assignedToId: id, status: { not: 'COMPLETED' } } }),
    // Need to fetch teams user is part of, then projects for those sections
    // Simple version: count all projects in sections the user belongs to
    prisma.project.count({
      where: {
        section: {
          users: {
            some: { userId: id }
          }
        },
        status: { not: 'COMPLETED' }
      }
    })
  ]);

  res.status(200).json({ success: true, data: { pendingTasks: tasksCount, activeProjects: projectsCount } });
});

export const adminCreateUser = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, name, email, mobile, password, role, designation } = req.body;
  
  const userExists = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });

  if (userExists) {
    res.status(400).json({ success: false, message: 'User with this email or employee ID already exists' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      employeeId,
      name,
      email,
      mobile,
      password: hashedPassword,
      role: role || 'TEAM_MEMBER',
      designation,
      isApproved: true,
      isActive: true
    },
    select: { id: true, name: true, employeeId: true, role: true, isApproved: true }
  });

  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, mobile, role, designation, isApproved } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, mobile, role, designation, isApproved },
    select: { id: true, name: true, email: true, role: true, isApproved: true }
  });

  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isApproved: true },
    select: { id: true, isApproved: true }
  });
  res.status(200).json({ success: true, data: user });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true }
  });
  res.status(200).json({ success: true, data: user, message: 'User deactivated successfully' });
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: { id: true, isActive: true }
  });
  res.status(200).json({ success: true, data: user, message: 'User activated successfully' });
});

// Update relational mappings (Teams AND automatically Sections)
export const updateUserMappings = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { teamIds } = req.body; // Only teamIds are sent by the frontend

  if (!teamIds || !Array.isArray(teamIds)) {
    return res.status(400).json({ success: false, message: 'teamIds must be an array' });
  }

  // Find parent sections of the selected teams
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { sectionId: true }
  });

  const sectionIds = Array.from(new Set(teams.map(t => t.sectionId)));

  await prisma.$transaction([
    prisma.userSectionMapping.deleteMany({ where: { userId: id } }),
    prisma.userTeamMapping.deleteMany({ where: { userId: id } }),
    
    // Recreate
    prisma.userSectionMapping.createMany({
      data: sectionIds.map((sectionId: string) => ({ userId: id, sectionId }))
    }),
    prisma.userTeamMapping.createMany({
      data: teamIds.map((teamId: string) => ({ userId: id, teamId }))
    })
  ]);

  res.status(200).json({ success: true, message: 'User mappings updated automatically' });
});
