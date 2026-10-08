import type { Request, Response } from 'express';
import { currentUser, uuidParam } from '../../lib/http.js';
import { createRequestSchema, listRequestsQuerySchema } from './transactions.schemas.js';
import * as transactionsService from './transactions.service.js';

export async function create(req: Request, res: Response): Promise<void> {
  const input = createRequestSchema.parse(req.body);
  res
    .status(201)
    .json({ request: await transactionsService.createRequest(currentUser(req), input) });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listRequestsQuerySchema.parse(req.query);
  res.json({ items: await transactionsService.listRequests(currentUser(req), query) });
}

export async function get(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json({ request: await transactionsService.getRequest(id, currentUser(req)) });
}

type TransitionFn = typeof transactionsService.approveRequest;

function transition(fn: TransitionFn) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = uuidParam.parse(req.params);
    res.json({ request: await fn(id, currentUser(req)) });
  };
}

export const approve = transition(transactionsService.approveRequest);
export const reject = transition(transactionsService.rejectRequest);
export const cancel = transition(transactionsService.cancelRequest);
export const complete = transition(transactionsService.completeRequest);
