import type { Request, Response } from 'express';
import { currentUser, uuidParam } from '../../lib/http.js';
import { listMessagesQuerySchema, sendMessageSchema } from './messaging.schemas.js';
import * as messagingService from './messaging.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  res.json({ items: await messagingService.listConversations(currentUser(req)) });
}

export async function messages(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { after } = listMessagesQuerySchema.parse(req.query);
  res.json(await messagingService.getMessages(id, currentUser(req), after));
}

export async function send(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { body } = sendMessageSchema.parse(req.body);
  res.status(201).json({ message: await messagingService.sendMessage(id, currentUser(req), body) });
}
