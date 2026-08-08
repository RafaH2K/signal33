import { AppError } from '../utils/AppError.js';
import * as productRepository from '../repositories/productRepository.js';
import * as uploadService from './uploadService.js';

export async function listProducts({ page, pageSize, includeInactive }) {
  const { products, total } = await productRepository.findAll({ page, pageSize, includeInactive });
  return { products, total, page, pageSize };
}

export async function getProduct(id, { includeInactive } = {}) {
  const product = await productRepository.findById(id, { includeInactive });
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

export async function createProduct(data) {
  return productRepository.create(data);
}

export async function updateProduct(id, data) {
  const existing = await productRepository.findById(id, { includeInactive: true });
  if (!existing) throw new AppError('Producto no encontrado', 404);

  const product = await productRepository.update(id, data);

  if (data.imageUrl && data.imageUrl !== existing.image_url) {
    await uploadService.deleteFileIfManaged(existing.image_url);
  }

  return product;
}

export async function deleteProduct(id) {
  const deleted = await productRepository.softDelete(id);
  if (!deleted) throw new AppError('Producto no encontrado', 404);
}
