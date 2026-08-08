import { AppError } from '../utils/AppError.js';
import * as galleryRepository from '../repositories/galleryRepository.js';
import * as uploadService from './uploadService.js';

export async function listItems({ includeInactive }) {
  return galleryRepository.findAll({ includeInactive });
}

export async function getItem(id, { includeInactive } = {}) {
  const item = await galleryRepository.findById(id, { includeInactive });
  if (!item) throw new AppError('Elemento de galería no encontrado', 404);
  return item;
}

export async function createItem(data) {
  return galleryRepository.create(data);
}

export async function updateItem(id, data) {
  const existing = await galleryRepository.findById(id, { includeInactive: true });
  if (!existing) throw new AppError('Elemento de galería no encontrado', 404);

  const item = await galleryRepository.update(id, data);

  if (data.url && data.url !== existing.url) {
    await uploadService.deleteFileIfManaged(existing.url);
  }

  return item;
}

export async function deleteItem(id) {
  const deleted = await galleryRepository.softDelete(id);
  if (!deleted) throw new AppError('Elemento de galería no encontrado', 404);
}

export async function reorderItems(items) {
  await galleryRepository.reorder(items);
  return listItems({ includeInactive: true });
}
