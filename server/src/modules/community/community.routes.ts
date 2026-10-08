import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import * as controller from './community.controller.js';

export const postsRouter = Router();
postsRouter.use(requireAuth);
postsRouter.get('/', controller.listPosts);
postsRouter.get('/tags', controller.popularTags);
postsRouter.post('/', writeLimiter, controller.createPost);
postsRouter.get('/:id', controller.getPost);
postsRouter.patch('/:id', controller.updatePost);
postsRouter.delete('/:id', controller.deletePost);
postsRouter.post('/:id/upvote', controller.upvotePost);
postsRouter.post('/:id/comments', writeLimiter, controller.addComment);

export const commentsRouter = Router();
commentsRouter.use(requireAuth);
commentsRouter.patch('/:id', controller.updateComment);
commentsRouter.delete('/:id', controller.deleteComment);
commentsRouter.post('/:id/upvote', controller.upvoteComment);
