import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

/** Mounts every feature module under /api. */
export function buildApiRouter(): Router {
  const api = Router();
  api.use('/health', healthRouter);
  return api;
}
