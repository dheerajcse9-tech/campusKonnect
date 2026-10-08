import { Router, type Request, type Response } from 'express';
import { currentUser } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { createReportSchema } from './reports.schemas.js';
import * as reportsService from './reports.service.js';

export const reportsRouter = Router();

reportsRouter.post('/', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  const input = createReportSchema.parse(req.body);
  res.status(201).json({ report: await reportsService.createReport(currentUser(req), input) });
});
