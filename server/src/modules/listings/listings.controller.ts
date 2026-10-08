import type { Request, Response } from 'express';
import { currentUser, uploadedBuffers, uuidParam } from '../../lib/http.js';
import {
  createListingSchema,
  imageParamsSchema,
  listListingsQuerySchema,
  listingStatusSchema,
  updateListingSchema,
} from './listings.schemas.js';
import * as listingsService from './listings.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await listingsService.listListings(listListingsQuerySchema.parse(req.query)));
}

export async function mine(req: Request, res: Response): Promise<void> {
  res.json({ items: await listingsService.listMyListings(currentUser(req)) });
}

export async function get(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json({ listing: await listingsService.getListing(id, currentUser(req)) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createListingSchema.parse(req.body);
  const listing = await listingsService.createListing(
    currentUser(req),
    input,
    uploadedBuffers(req),
  );
  res.status(201).json({ listing });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const input = updateListingSchema.parse(req.body);
  res.json({ listing: await listingsService.updateListing(id, currentUser(req), input) });
}

export async function addImages(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  res.json({
    listing: await listingsService.addImages(id, currentUser(req), uploadedBuffers(req)),
  });
}

export async function removeImage(req: Request, res: Response): Promise<void> {
  const { id, imageId } = imageParamsSchema.parse(req.params);
  res.json({ listing: await listingsService.removeImage(id, imageId, currentUser(req)) });
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  const { status } = listingStatusSchema.parse(req.body);
  res.json({ listing: await listingsService.setStatus(id, currentUser(req), status) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await listingsService.deleteListing(id, currentUser(req));
  res.status(204).end();
}
