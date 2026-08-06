import { AppError } from '../utils/AppError.js';
import * as cartRepository from '../repositories/cartRepository.js';
import * as productRepository from '../repositories/productRepository.js';

function toCartView(cart, items) {
  const mapped = items.map((item) => ({
    productId: item.product_id,
    name: item.name,
    price: item.price,
    imageUrl: item.image_url,
    stock: item.stock,
    quantity: item.quantity,
    subtotal: Number(item.price) * item.quantity,
  }));
  const total = mapped.reduce((sum, item) => sum + item.subtotal, 0);
  return { id: cart.id, items: mapped, total };
}

export async function getCart(userId) {
  const cart = await cartRepository.findOrCreateByUserId(userId);
  const items = await cartRepository.getItemsWithProduct(cart.id);
  return toCartView(cart, items);
}

export async function addItem(userId, { productId, quantity }) {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError('Producto no encontrado', 404);

  const cart = await cartRepository.findOrCreateByUserId(userId);
  const existing = await cartRepository.findItem(cart.id, productId);
  const newQuantity = (existing?.quantity || 0) + quantity;
  if (newQuantity > product.stock) throw new AppError('Stock insuficiente', 400);

  await cartRepository.addItem(cart.id, productId, quantity);
  return getCart(userId);
}

export async function updateItemQuantity(userId, productId, quantity) {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError('Producto no encontrado', 404);
  if (quantity > product.stock) throw new AppError('Stock insuficiente', 400);

  const cart = await cartRepository.findOrCreateByUserId(userId);
  const updated = await cartRepository.setItemQuantity(cart.id, productId, quantity);
  if (!updated) throw new AppError('El producto no está en el carrito', 404);

  return getCart(userId);
}

export async function removeItem(userId, productId) {
  const cart = await cartRepository.findOrCreateByUserId(userId);
  const deleted = await cartRepository.removeItem(cart.id, productId);
  if (!deleted) throw new AppError('El producto no está en el carrito', 404);

  return getCart(userId);
}
