import { AppError } from '../utils/AppError.js';
import * as productRepository from '../repositories/productRepository.js';

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
  const product = await productRepository.update(id, data);
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

export async function deleteProduct(id) {
  const deleted = await productRepository.softDelete(id);
  if (!deleted) throw new AppError('Producto no encontrado', 404);
}
