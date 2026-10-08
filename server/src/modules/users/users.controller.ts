import type { Request, Response } from 'express';
import { BadRequestError } from '../../lib/errors.js';
import { currentUser, uuidParam } from '../../lib/http.js';
import { updateProfileSchema } from './users.schemas.js';
import * as usersService from './users.service.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ user: await usersService.getMe(currentUser(req).id) });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = updateProfileSchema.parse(req.body);
  res.json({ user: await usersService.updateMe(currentUser(req).id, input) });
}

export async function updateAvatar(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new BadRequestError('Attach an image in the "image" field');
  res.json({ user: await usersService.updateAvatar(currentUser(req).id, req.file.buffer) });
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json({ user: await usersService.getPublicProfile(id) });
}
