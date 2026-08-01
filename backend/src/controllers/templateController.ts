import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';

// GET ALL TEMPLATES
export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = await prisma.taskTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: templates });
});

// CREATE TEMPLATE (ADMIN)
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category, structure } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Template name is required' });
  }

  const existing = await prisma.taskTemplate.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return res.status(400).json({ success: false, message: `Template with name "${name.trim()}" already exists` });
  }

  const template = await prisma.taskTemplate.create({
    data: {
      name: name.trim(),
      description,
      category: category || 'GENERAL',
      structure: typeof structure === 'string' ? structure : JSON.stringify(structure || [])
    }
  });

  res.status(201).json({ success: true, data: template });
});

// APPLY TEMPLATE TO A PROJECT
export const applyTemplateToProject = asyncHandler(async (req: any, res: Response) => {
  const { projectId } = req.params;
  const { templateId } = req.body;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  let activitiesData = [];
  try {
    activitiesData = JSON.parse(template.structure);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid template structure JSON' });
  }

  const createdActivities = [];

  for (const act of activitiesData) {
    const newActivity = await prisma.activity.create({
      data: {
        name: act.name,
        description: act.description,
        projectId: project.id,
        sectionId: project.sectionId
      }
    });

    if (act.tasks && Array.isArray(act.tasks)) {
      for (const t of act.tasks) {
        await prisma.task.create({
          data: {
            title: t.title,
            description: t.description,
            priority: t.priority || 'MEDIUM',
            estimatedHours: t.estimatedHours ? parseFloat(t.estimatedHours) : null,
            projectId: project.id,
            activityId: newActivity.id,
            sectionId: project.sectionId,
            createdById: req.user.id,
            status: 'NOT_STARTED'
          }
        });
      }
    }

    createdActivities.push(newActivity);
  }

  res.status(200).json({
    success: true,
    data: createdActivities,
    message: `Applied template "${template.name}" to project "${project.name}" successfully.`
  });
});
