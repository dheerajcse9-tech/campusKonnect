import type { Request, Response } from 'express';
import { currentUser, uuidParam } from '../../lib/http.js';
import {
  banSchema,
  dismissReportSchema,
  listAuditQuerySchema,
  listReportsQuerySchema,
  listUsersQuerySchema,
  removeContentSchema,
  resolveReportSchema,
} from './admin.schemas.js';
import * as adminService from './admin.service.js';

export async function stats(_req: Request, res: Response): Promise<void> {
  res.json(await adminService.getStats());
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  res.json(await adminService.listUsers(listUsersQuerySchema.parse(req.query)));
}

export async function banUser(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { reason } = banSchema.parse(req.body);
  await adminService.banUser(currentUser(req), id, reason);
  res.status(204).end();
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await adminService.unbanUser(currentUser(req), id);
  res.status(204).end();
}

function removeContent(type: 'LISTING' | 'POST' | 'COMMENT') {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = uuidParam.parse(req.params);
    const { reason } = removeContentSchema.parse(req.body);
    await adminService.removeContent(currentUser(req), type, id, reason);
    res.status(204).end();
  };
}

export const removeListing = removeContent('LISTING');
export const removePost = removeContent('POST');
export const removeComment = removeContent('COMMENT');

export async function listReports(req: Request, res: Response): Promise<void> {
  res.json(await adminService.listReports(listReportsQuerySchema.parse(req.query)));
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await adminService.resolveReport(currentUser(req), id, resolveReportSchema.parse(req.body));
  res.status(204).end();
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { note } = dismissReportSchema.parse(req.body);
  await adminService.dismissReport(currentUser(req), id, note);
  res.status(204).end();
}

export async function auditLogs(req: Request, res: Response): Promise<void> {
  res.json(await adminService.listAuditLogs(listAuditQuerySchema.parse(req.query)));
}
