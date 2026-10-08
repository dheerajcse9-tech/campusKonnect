import type { Request, Response } from 'express';
import { currentUser, uuidParam } from '../../lib/http.js';
import {
  commentSchema,
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from './community.schemas.js';
import * as communityService from './community.service.js';

export async function listPosts(req: Request, res: Response): Promise<void> {
  const query = listPostsQuerySchema.parse(req.query);
  res.json(await communityService.listPosts(currentUser(req), query));
}

export async function popularTags(_req: Request, res: Response): Promise<void> {
  res.json({ items: await communityService.popularTags() });
}

export async function getPost(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json({ post: await communityService.getPost(id, currentUser(req)) });
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const input = createPostSchema.parse(req.body);
  res.status(201).json({ post: await communityService.createPost(currentUser(req), input) });
}

export async function updatePost(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const input = updatePostSchema.parse(req.body);
  res.json({ post: await communityService.updatePost(id, currentUser(req), input) });
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await communityService.deletePost(id, currentUser(req));
  res.status(204).end();
}

export async function upvotePost(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json(await communityService.togglePostUpvote(id, currentUser(req)));
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { body } = commentSchema.parse(req.body);
  res.status(201).json({ comment: await communityService.addComment(id, currentUser(req), body) });
}

export async function updateComment(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { body } = commentSchema.parse(req.body);
  res.json({ comment: await communityService.updateComment(id, currentUser(req), body) });
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await communityService.removeComment(id, currentUser(req));
  res.status(204).end();
}

export async function upvoteComment(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json(await communityService.toggleCommentUpvote(id, currentUser(req)));
}
