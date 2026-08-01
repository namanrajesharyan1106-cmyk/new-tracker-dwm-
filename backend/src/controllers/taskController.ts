import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { asyncHandler } from '../utils/asyncHandler';
import { updateRequirementProgressCascade } from './requirementController';

// ---- RECALCULATE PROGRESS CASCADE (Subtask -> Task -> Activity -> Project) ----
const recalculateProgressCascade = async (taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { parentTaskId: true, activityId: true, projectId: true, requirementId: true }
  });

  if (!task) return;

  // 1. Recalculate Parent Task if this is a subtask
  if (task.parentTaskId) {
    const siblingSubtasks = await prisma.task.findMany({
      where: { parentTaskId: task.parentTaskId },
      select: { progress: true }
    });
    if (siblingSubtasks.length > 0) {
      const avgProgress = Math.round(siblingSubtasks.reduce((sum: number, st: any) => sum + (st.progress || 0), 0) / siblingSubtasks.length);
      await prisma.task.update({
        where: { id: task.parentTaskId },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? 'COMPLETED' : avgProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
        }
      });
      // Recursively cascade to grandparent if needed
      await recalculateProgressCascade(task.parentTaskId);
    }
  }

  // 2. Recalculate Parent Requirement (DRS Master Project Charter) if linked
  if (task.requirementId) {
    await updateRequirementProgressCascade(task.requirementId);
  }

  // 3. Recalculate Parent Activity if linked
  if (task.activityId) {
    const activityTasks = await prisma.task.findMany({
      where: { activityId: task.activityId },
      select: { progress: true }
    });
    if (activityTasks.length > 0) {
      const avgProgress = Math.round(activityTasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / activityTasks.length);
      await prisma.activity.update({
        where: { id: task.activityId },
        data: {
          progress: avgProgress,
          status: avgProgress === 100 ? 'COMPLETED' : avgProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
        }
      });
    }
  }

  // 4. Recalculate Parent Project if linked
  if (task.projectId) {
    const projectTasks = await prisma.task.findMany({
      where: { projectId: task.projectId },
      select: { progress: true }
    });
    if (projectTasks.length > 0) {
      const avgProgress = Math.round(projectTasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / projectTasks.length);
      await prisma.project.update({
        where: { id: task.projectId },
        data: { progress: avgProgress }
      });
    }
  }
};

// ---- CREATE TASK / SUBTASK / MILESTONE ----
export const createTask = asyncHandler(async (req: any, res: Response) => {
  const { title, description, priority, type, stageName, requirementId, projectId, activityId, sectionId, teamId, assignedToId, parentTaskId, targetDate, estimatedHours, dependencyIds, attachmentUrl, isRecurring, recurrenceInterval } = req.body;
  
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Task title is required' });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description,
      priority: priority || 'MEDIUM',
      type: type || (parentTaskId ? 'SUBTASK' : 'TASK'),
      stageName: stageName || 'Discovery',
      requirementId: requirementId || null,
      projectId: projectId || null,
      activityId: activityId || null,
      sectionId: sectionId || null,
      teamId: teamId || null,
      assignedToId: assignedToId || null,
      parentTaskId: parentTaskId || null,
      targetDate: targetDate ? new Date(targetDate) : null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      createdById: req.user.id,
      status: 'NOT_STARTED',
      attachmentUrl,
      isRecurring: isRecurring || false,
      recurrenceInterval,
      dependencies: dependencyIds && dependencyIds.length > 0 ? {
        connect: dependencyIds.map((id: string) => ({ id }))
      } : undefined
    },
    include: { dependencies: true, subtasks: true }
  });

  // Trigger progress cascade
  await recalculateProgressCascade(task.id);

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE_TASK',
      entity: 'Task',
      entityId: task.id,
      details: JSON.stringify({ title: task.title, type: task.type })
    }
  });

  res.status(201).json({ success: true, data: task });
});

// ---- CREATE PERSONAL TASK (UNLINKED TO PROJECT) ----
export const createPersonalTask = asyncHandler(async (req: any, res: Response) => {
  const { title, description, priority, targetDate, estimatedHours } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Task title is required' });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description,
      priority: priority || 'MEDIUM',
      type: 'PERSONAL_TASK',
      createdById: req.user.id,
      assignedToId: req.user.id,
      targetDate: targetDate ? new Date(targetDate) : null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      status: 'NOT_STARTED'
    }
  });

  res.status(201).json({ success: true, data: task, message: 'Personal task created successfully' });
});

// ---- GET TASKS ----
export const getTasks = asyncHandler(async (req: any, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';
  const filter = req.query.filter as string; // 'all', 'my_tasks', 'created_by_me', 'personal'
  const projectId = req.query.projectId as string;
  const activityId = req.query.activityId as string;
  const type = req.query.type as string;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (projectId) where.projectId = projectId;
  if (activityId) where.activityId = activityId;
  if (type) where.type = type;

  // RBAC & Filters
  if (filter === 'personal') {
    where.type = 'PERSONAL_TASK';
    where.createdById = req.user.id;
  } else if (req.user.role === 'TEAM_MEMBER') {
    where.OR = [
      { assignedToId: req.user.id },
      { createdById: req.user.id },
      { assignedUsers: { some: { userId: req.user.id } } }
    ];
  } else {
    if (filter === 'my_tasks') where.assignedToId = req.user.id;
    if (filter === 'created_by_me') where.createdById = req.user.id;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedUsers: { include: { user: { select: { id: true, name: true } } } },
        createdBy: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
        dependencies: { select: { id: true, title: true, status: true } },
        section: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        subtasks: { select: { id: true, title: true, status: true, progress: true } },
        _count: { select: { comments: true, subtasks: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.task.count({ where })
  ]);

  res.status(200).json({ success: true, data: tasks, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ---- GET TASK DETAILS FOR DRAWER ----
export const getTaskDetails = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, employeeId: true } },
      assignedUsers: { include: { user: { select: { id: true, name: true, employeeId: true } } } },
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, drsRequestId: true } },
      activity: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      dependencies: { select: { id: true, title: true, status: true } },
      subtasks: {
        include: {
          assignedTo: { select: { id: true, name: true } }
        }
      },
      delayHistory: { orderBy: { createdAt: 'desc' } },
      blockHistory: { orderBy: { createdAt: 'desc' } },
      comments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const commentUserIds = Array.from(new Set(task.comments.map(c => c.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: commentUserIds } },
    select: { id: true, name: true, employeeId: true }
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const formattedComments = task.comments.map(c => ({
    ...c,
    author: userMap.get(c.userId) || { name: 'Unknown User' }
  }));

  res.status(200).json({
    success: true,
    data: {
      ...task,
      assignedUsers: task.assignedUsers.map(au => au.user),
      comments: formattedComments
    }
  });
});

// ---- ADD COMMENT TO TASK ----
export const addTaskComment = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required' });
  }

  const newComment = await prisma.taskComment.create({
    data: {
      taskId: id,
      userId: req.user.id,
      comment: comment.trim()
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, employeeId: true }
  });

  res.status(201).json({
    success: true,
    data: { ...newComment, author: user }
  });
});

// ---- MULTI-USER COLLABORATIVE ASSIGNMENT ----
export const assignTaskUsers = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ success: false, message: 'userIds must be an array' });
  }

  await prisma.$transaction([
    prisma.userTaskMapping.deleteMany({ where: { taskId: id } }),
    prisma.userTaskMapping.createMany({
      data: userIds.map((userId: string) => ({ taskId: id, userId }))
    })
  ]);

  res.status(200).json({ success: true, message: 'Task user assignments updated successfully' });
});

// ---- LOG MANDATORY TASK DELAY ----
export const logTaskDelay = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { reason, customReason, expectedCompletion, estimatedDelayDays, comments } = req.body;

  if (!reason || !expectedCompletion) {
    return res.status(400).json({ success: false, message: 'Delay reason and expected completion date are required' });
  }

  const delayRecord = await prisma.taskDelayHistory.create({
    data: {
      taskId: id,
      reason,
      customReason,
      expectedCompletion: new Date(expectedCompletion),
      estimatedDelayDays: estimatedDelayDays ? parseInt(estimatedDelayDays) : 1,
      comments
    }
  });

  await prisma.task.update({
    where: { id },
    data: {
      status: 'DELAYED',
      delayReason: reason,
      targetDate: new Date(expectedCompletion)
    }
  });

  await recalculateProgressCascade(id);

  res.status(201).json({ success: true, data: delayRecord, message: 'Task delay logged successfully' });
});

// ---- LOG MANDATORY TASK BLOCKER ----
export const logTaskBlock = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { reason, expectedResolution } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Block reason is required' });
  }

  const blockRecord = await prisma.taskBlockHistory.create({
    data: {
      taskId: id,
      reason: reason.trim(),
      expectedResolution: expectedResolution ? new Date(expectedResolution) : null
    }
  });

  await prisma.task.update({
    where: { id },
    data: {
      status: 'BLOCKED',
      blockReason: reason.trim()
    }
  });

  await recalculateProgressCascade(id);

  res.status(201).json({ success: true, data: blockRecord, message: 'Task block logged successfully' });
});

// ---- UPDATE TASK DETAILS ----
export const updateTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, priority, type, sectionId, teamId, assignedToId, targetDate, estimatedHours, dependencyIds, attachmentUrl } = req.body;
  
  const task = await prisma.task.update({
    where: { id },
    data: {
      title: title ? title.trim() : undefined,
      description,
      priority,
      type,
      sectionId,
      teamId,
      assignedToId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      estimatedHours: estimatedHours !== undefined ? parseFloat(estimatedHours) : undefined,
      attachmentUrl,
      dependencies: dependencyIds ? {
        set: dependencyIds.map((did: string) => ({ id: did }))
      } : undefined
    },
    include: { dependencies: true }
  });

  await recalculateProgressCascade(id);

  res.status(200).json({ success: true, data: task });
});

// ---- DELETE TASK ----
export const deleteTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  await prisma.task.delete({ where: { id } });
  res.status(200).json({ success: true, message: 'Task deleted successfully' });
});

// ---- ADD DAILY WORK LOG & AUTOMATIC HOUR AGGREGATION ----
export const addWorkLog = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { hoursWorked, workSummary, remarks, date } = req.body;

  if (!hoursWorked || parseFloat(hoursWorked) <= 0 || !workSummary || !workSummary.trim()) {
    return res.status(400).json({ success: false, message: 'Valid hoursWorked and workSummary are required' });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const workLog = await prisma.taskWorkLog.create({
    data: {
      taskId: id,
      userId: req.user.id,
      date: date ? new Date(date) : new Date(),
      hoursWorked: parseFloat(hoursWorked),
      workSummary: workSummary.trim(),
      remarks
    }
  });

  // Calculate new actual hours
  const newActualHours = (task.actualHours || 0) + parseFloat(hoursWorked);

  await prisma.task.update({
    where: { id },
    data: {
      actualHours: newActualHours
    }
  });

  // Aggregate activity actual hours
  if (task.activityId) {
    const activityTasks = await prisma.task.findMany({
      where: { activityId: task.activityId },
      select: { actualHours: true }
    });
    const totalActivityHours = activityTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    await prisma.activity.update({
      where: { id: task.activityId },
      data: { actualHours: totalActivityHours }
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'ADD_WORK_LOG',
      entity: 'Task',
      entityId: id,
      details: JSON.stringify({ hoursWorked, workSummary })
    }
  });

  res.status(201).json({ success: true, data: workLog, message: 'Work log added successfully' });
});

// ---- VERIFY & CLOSE TASK WORKFLOW ----
export const verifyTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { action, comments } = req.body; // action: 'VERIFIED', 'REJECTED', 'CLOSED'

  if (!['VERIFIED', 'REJECTED', 'CLOSED'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be VERIFIED, REJECTED, or CLOSED' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ success: false, message: 'Only Team Leads and Admins can verify or close tasks' });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  if (action === 'VERIFIED' && task.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Task must be in COMPLETED status before verification' });
  }

  if (action === 'CLOSED' && task.status !== 'VERIFIED' && task.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Task must be VERIFIED or COMPLETED before closing' });
  }

  const targetStatus = action === 'REJECTED' ? 'IN_PROGRESS' : action;

  await prisma.taskVerificationHistory.create({
    data: {
      taskId: id,
      verifierId: req.user.id,
      action,
      comments
    }
  });

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: targetStatus,
      progress: action === 'REJECTED' ? 90 : task.progress
    }
  });

  await recalculateProgressCascade(id);

  res.status(200).json({ success: true, data: updatedTask, message: `Task ${action.toLowerCase()} successfully` });
});

// ---- TRIGGER RECURRING TASKS SCHEDULER ----
export const triggerRecurringTasks = asyncHandler(async (req: Request, res: Response) => {
  const recurringTasks = await prisma.task.findMany({
    where: {
      isRecurring: true
    }
  });

  const createdInstances = [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  for (const t of recurringTasks) {
    const existingToday = await prisma.task.findFirst({
      where: {
        title: { startsWith: t.title },
        createdAt: { gte: startOfDay }
      }
    });

    if (!existingToday) {
      const newInst = await prisma.task.create({
        data: {
          title: `${t.title} [${new Date().toLocaleDateString()}]`,
          description: t.description,
          priority: t.priority,
          type: t.type,
          projectId: t.projectId,
          activityId: t.activityId,
          sectionId: t.sectionId,
          teamId: t.teamId,
          assignedToId: t.assignedToId,
          createdById: t.createdById,
          status: 'NOT_STARTED',
          estimatedHours: t.estimatedHours
        }
      });
      createdInstances.push(newInst);
    }
  }

  res.status(200).json({ success: true, data: createdInstances, message: `Generated ${createdInstances.length} recurring task instances.` });
});

// ---- UPDATE TASK PROGRESS & STATUS ENFORCEMENT ----
export const updateTaskProgress = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { progress, status } = req.body;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { dependencies: true }
  });

  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  // Check prerequisite dependencies
  if (status === 'IN_PROGRESS' || status === 'COMPLETED' || (progress && progress > 0)) {
    const incompleteDependencies = task.dependencies.filter(d => !['COMPLETED', 'VERIFIED', 'CLOSED'].includes(d.status));
    if (incompleteDependencies.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot start or complete task. Mandatory prerequisite task "${incompleteDependencies[0].title}" is not completed.`
      });
    }
  }

  const updateData: any = {};
  
  if (progress !== undefined) {
    const validProgress = Math.min(100, Math.max(0, parseInt(progress)));
    updateData.progress = validProgress;
    if (validProgress === 100) updateData.status = 'COMPLETED';
    else if (validProgress > 0 && task.status === 'NOT_STARTED') updateData.status = 'IN_PROGRESS';
  }
  
  if (status) updateData.status = status;
  if (updateData.status === 'COMPLETED') updateData.completionDate = new Date();

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  // Cascade progress recalculation to parent task, activity, and project
  await recalculateProgressCascade(id);

  res.status(200).json({ success: true, data: updatedTask });
});

// ---- BULK ASSIGN TASKS ----
export const bulkAssignTasks = asyncHandler(async (req: any, res: Response) => {
  const { taskIds, assignedToId } = req.body;
  
  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { assignedToId }
  });

  res.status(200).json({ success: true, message: 'Tasks successfully assigned' });
});

// ---- CLONE TASK ----
export const cloneTask = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const originalTask = await prisma.task.findUnique({
    where: { id },
    include: { dependencies: true }
  });

  if (!originalTask) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const clonedTask = await prisma.task.create({
    data: {
      title: `${originalTask.title} (Clone)`,
      description: originalTask.description,
      priority: originalTask.priority,
      type: originalTask.type,
      sectionId: originalTask.sectionId,
      teamId: originalTask.teamId,
      estimatedHours: originalTask.estimatedHours,
      createdById: req.user.id,
      status: 'NOT_STARTED',
      dependencies: {
        connect: originalTask.dependencies.map(d => ({ id: d.id }))
      }
    }
  });

  res.status(201).json({ success: true, data: clonedTask, message: 'Task cloned successfully' });
});

