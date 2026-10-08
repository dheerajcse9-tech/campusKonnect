import type { Actor } from '../../lib/auth-context.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { findReportTarget } from './report-targets.js';
import type { CreateReportInput } from './reports.schemas.js';

export async function createReport(actor: Actor, input: CreateReportInput) {
  const target = await findReportTarget(input.targetType, input.targetId);
  if (!target || !target.active) throw new NotFoundError('Reported item');
  if (target.ownerId === actor.id)
    throw new BadRequestError("You can't report yourself or your own content");

  const duplicate = await prisma.report.findFirst({
    where: {
      reporterId: actor.id,
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'OPEN',
    },
  });
  if (duplicate)
    throw new ConflictError('You have already reported this. Our moderators will review it.');

  return prisma.report.create({
    data: {
      reporterId: actor.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details || null,
    },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  });
}
