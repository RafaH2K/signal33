import {
  createGallerySchema,
  updateGallerySchema,
  listGalleryQuerySchema,
  reorderGallerySchema,
} from '../validators/galleryValidator.js';
import * as galleryService from '../services/galleryService.js';
import { ok } from '../utils/response.js';

function canSeeInactive(req) {
  return req.user?.role === 'ADMIN';
}

export async function list(req, res, next) {
  try {
    const { includeInactive } = listGalleryQuerySchema.parse(req.query);
    const items = await galleryService.listItems({
      includeInactive: includeInactive && canSeeInactive(req),
    });
    ok(res, items);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const item = await galleryService.getItem(req.params.id, { includeInactive: canSeeInactive(req) });
    ok(res, item);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createGallerySchema.parse(req.body);
    const item = await galleryService.createItem(data);
    ok(res, item, 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateGallerySchema.parse(req.body);
    const item = await galleryService.updateItem(req.params.id, data);
    ok(res, item);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await galleryService.deleteItem(req.params.id);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}

export async function reorder(req, res, next) {
  try {
    const { items } = reorderGallerySchema.parse(req.body);
    const result = await galleryService.reorderItems(items);
    ok(res, result);
  } catch (error) {
    next(error);
  }
}
