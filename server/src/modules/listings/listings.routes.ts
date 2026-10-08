import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { MAX_LISTING_IMAGES, imageUpload } from '../../middleware/upload.js';
import * as controller from './listings.controller.js';

export const listingsRouter = Router();

const images = imageUpload.array('images', MAX_LISTING_IMAGES);

listingsRouter.use(requireAuth);
listingsRouter.get('/', controller.list);
listingsRouter.get('/mine', controller.mine);
listingsRouter.post('/', writeLimiter, images, controller.create);
listingsRouter.get('/:id', controller.get);
listingsRouter.patch('/:id', controller.update);
listingsRouter.post('/:id/images', images, controller.addImages);
listingsRouter.delete('/:id/images/:imageId', controller.removeImage);
listingsRouter.patch('/:id/status', controller.setStatus);
listingsRouter.delete('/:id', controller.remove);
