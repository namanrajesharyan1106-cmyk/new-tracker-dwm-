import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: projects });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { name, drsRequestId, plant, priority, sectionId } = req.body;
  const project = await prisma.project.create({
    data: { name, drsRequestId, plant, priority, sectionId, status: 'NOT_STARTED' },
  });
  res.status(201).json({ success: true, data: project });
});
