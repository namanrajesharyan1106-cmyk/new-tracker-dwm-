import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// Section Controllers
export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const section = await prisma.section.create({
    data: { name, description },
  });
  res.status(201).json({ success: true, data: section });
});

export const getSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await prisma.section.findMany({
    include: { teams: true },
  });
  res.status(200).json({ success: true, data: sections });
});

// Team Controllers
export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, sectionId } = req.body;
  const team = await prisma.team.create({
    data: { name, description, sectionId },
  });
  res.status(201).json({ success: true, data: team });
});

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    include: { section: true },
  });
  res.status(200).json({ success: true, data: teams });
});

// User Management (Admin)
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, mobile: true, role: true, employeeId: true, isApproved: true, designation: true },
  });
  res.status(200).json({ success: true, data: users });
});

export const adminCreateUser = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, name, email, mobile, password, role, designation } = req.body;
  
  const userExists = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });

  if (userExists) {
    res.status(400).json({ success: false, message: 'User already exists' });
    return;
  }

  const salt = await require('bcryptjs').genSalt(10);
  const hashedPassword = await require('bcryptjs').hash(password, salt);

  const user = await prisma.user.create({
    data: {
      employeeId,
      name,
      email,
      mobile,
      password: hashedPassword,
      role: role || 'TEAM_MEMBER',
      designation,
      isApproved: true, // Created by admin, auto-approved
    },
  });

  res.status(201).json({ success: true, data: { id: user.id, employeeId: user.employeeId, isApproved: user.isApproved } });
});

export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isApproved: true },
  });
  res.status(200).json({ success: true, data: { id: user.id, isApproved: user.isApproved } });
});
