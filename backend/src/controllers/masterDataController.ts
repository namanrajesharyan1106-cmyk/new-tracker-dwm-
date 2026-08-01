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
                  role: true, designation: true, isApproved: true, isActive: true,
                  teams: { include: { team: { select: { id: true, name: true } } } }
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
      users: team.users.map(u => ({
        ...u.user,
        teams: u.user.teams ? u.user.teams.map(t => t.team) : []
      }))
    }))
  }));

  res.status(200).json({ success: true, data: formattedTree });
});

// ---- SECTIONS ----

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Section name is required' });
  }

  const existingSection = await prisma.section.findFirst({
    where: { name: { equals: name.trim() } }
  });

  if (existingSection) {
    return res.status(400).json({ success: false, message: `Section "${name.trim()}" already exists.` });
  }

  const section = await prisma.section.create({
    data: { name: name.trim(), description: description ? description.trim() : null },
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
  const id = req.params.id as string;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Section name is required' });
  }

  const existingSection = await prisma.section.findFirst({
    where: {
      name: { equals: name.trim() },
      id: { not: id }
    }
  });

  if (existingSection) {
    return res.status(400).json({ success: false, message: `Another section with name "${name.trim()}" already exists.` });
  }

  const section = await prisma.section.update({
    where: { id },
    data: { name: name.trim(), description: description ? description.trim() : null },
  });
  res.status(200).json({ success: true, data: section });
});

export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.section.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Section deleted successfully' });
});

// ---- TEAMS ----

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, sectionId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Team name is required' });
  }

  if (!sectionId || !sectionId.trim()) {
    return res.status(400).json({ success: false, message: 'Parent Section is required' });
  }

  // Verify section exists
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return res.status(400).json({ success: false, message: 'Selected Parent Section does not exist' });
  }

  // Check duplicate team name in section
  const existingTeam = await prisma.team.findFirst({
    where: {
      sectionId,
      name: { equals: name.trim() }
    }
  });

  if (existingTeam) {
    return res.status(400).json({ success: false, message: `Team "${name.trim()}" already exists in ${section.name}` });
  }

  const team = await prisma.team.create({
    data: { name: name.trim(), description: description ? description.trim() : null, sectionId },
    include: { section: true }
  });
  res.status(201).json({ success: true, data: team });
});

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const sectionId = req.query.sectionId as string | undefined;
  const where = sectionId ? { sectionId } : {};

  const teams = await prisma.team.findMany({
    where,
    include: { section: true, _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: teams });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, description, sectionId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Team name is required' });
  }

  if (!sectionId || !sectionId.trim()) {
    return res.status(400).json({ success: false, message: 'Parent Section is required' });
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return res.status(400).json({ success: false, message: 'Selected Parent Section does not exist' });
  }

  const existingTeam = await prisma.team.findFirst({
    where: {
      sectionId,
      name: { equals: name.trim() },
      id: { not: id }
    }
  });

  if (existingTeam) {
    return res.status(400).json({ success: false, message: `Team "${name.trim()}" already exists in ${section.name}` });
  }

  const team = await prisma.team.update({
    where: { id },
    data: { name: name.trim(), description: description ? description.trim() : null, sectionId },
    include: { section: true }
  });

  // Re-sync section mappings for all users in this team to ensure parent section inheritance is updated
  const teamUsers = await prisma.userTeamMapping.findMany({
    where: { teamId: id },
    select: { userId: true }
  });

  for (const { userId } of teamUsers) {
    const userTeams = await prisma.team.findMany({
      where: { users: { some: { userId } } },
      select: { sectionId: true }
    });
    const sectionIds = Array.from(new Set(userTeams.map(t => t.sectionId)));
    await prisma.userSectionMapping.deleteMany({ where: { userId } });
    if (sectionIds.length > 0) {
      await prisma.userSectionMapping.createMany({
        data: sectionIds.map(sId => ({ userId, sectionId: sId }))
      });
    }
  }

  res.status(200).json({ success: true, data: team });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const teamUsers = await prisma.userTeamMapping.findMany({
    where: { teamId: id },
    select: { userId: true }
  });

  await prisma.team.delete({ where: { id } });

  for (const { userId } of teamUsers) {
    const userTeams = await prisma.team.findMany({
      where: { users: { some: { userId } } },
      select: { sectionId: true }
    });
    const sectionIds = Array.from(new Set(userTeams.map(t => t.sectionId)));
    await prisma.userSectionMapping.deleteMany({ where: { userId } });
    if (sectionIds.length > 0) {
      await prisma.userSectionMapping.createMany({
        data: sectionIds.map(sectionId => ({ userId, sectionId }))
      });
    }
  }

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
  const id = req.params.id as string;
  
  const [tasksCount, projectsCount] = await Promise.all([
    prisma.task.count({ where: { assignedToId: id, status: { not: 'COMPLETED' } } }),
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
  const { employeeId, name, email, mobile, password, role, designation, teamIds } = req.body;
  
  if (!employeeId || !name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Employee ID, Name, Email and Password are required' });
  }

  const userExists = await prisma.user.findFirst({
    where: { OR: [{ email: email.trim() }, { employeeId: employeeId.trim() }] },
  });

  if (userExists) {
    res.status(400).json({ success: false, message: 'User with this email or employee ID already exists' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim(),
      mobile: mobile ? mobile.trim() : null,
      password: hashedPassword,
      role: role || 'TEAM_MEMBER',
      designation: designation ? designation.trim() : null,
      isApproved: true,
      isActive: true
    },
    select: { id: true, name: true, employeeId: true, role: true, isApproved: true }
  });

  if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { sectionId: true }
    });
    const sectionIds = Array.from(new Set(teams.map(t => t.sectionId)));

    await prisma.$transaction([
      prisma.userSectionMapping.createMany({
        data: sectionIds.map(sectionId => ({ userId: user.id, sectionId }))
      }),
      prisma.userTeamMapping.createMany({
        data: teamIds.map(teamId => ({ userId: user.id, teamId }))
      })
    ]);
  }

  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email, mobile, role, designation, isApproved } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, mobile, role, designation, isApproved },
    select: { id: true, name: true, email: true, role: true, isApproved: true }
  });

  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.user.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.update({
    where: { id },
    data: { isApproved: true },
    select: { id: true, isApproved: true }
  });
  res.status(200).json({ success: true, data: user });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true }
  });
  res.status(200).json({ success: true, data: user, message: 'User deactivated successfully' });
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: { id: true, isActive: true }
  });
  res.status(200).json({ success: true, data: user, message: 'User activated successfully' });
});

// Update relational mappings (Teams AND automatically Sections)
export const updateUserMappings = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { teamIds } = req.body;

  if (!teamIds || !Array.isArray(teamIds)) {
    return res.status(400).json({ success: false, message: 'teamIds must be an array' });
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { sectionId: true }
  });

  const sectionIds = Array.from(new Set(teams.map(t => t.sectionId)));

  await prisma.$transaction([
    prisma.userSectionMapping.deleteMany({ where: { userId: id } }),
    prisma.userTeamMapping.deleteMany({ where: { userId: id } }),
    
    prisma.userSectionMapping.createMany({
      data: sectionIds.map((sectionId: string) => ({ userId: id, sectionId }))
    }),
    prisma.userTeamMapping.createMany({
      data: teamIds.map((teamId: string) => ({ userId: id, teamId }))
    })
  ]);

  res.status(200).json({ success: true, message: 'User mappings updated automatically' });
});

// Update System Role Only
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ success: false, message: 'Role is required' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, role: true }
  });

  res.status(200).json({ success: true, data: user, message: 'User role updated successfully' });
});

// Update Team Leadership Hierarchy (Manager & Team Lead)
export const updateTeamHierarchy = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { managerId, teamLeadId } = req.body;

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return res.status(404).json({ success: false, message: 'Team not found' });
  }

  res.status(200).json({ success: true, message: 'Team hierarchy updated successfully' });
});
