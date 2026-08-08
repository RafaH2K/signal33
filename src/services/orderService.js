import { AppError } from '../utils/AppError.js';
import * as orderRepository from '../repositories/orderRepository.js';

export async function createOrder(userId) {
  return orderRepository.createFromCart(userId);
}

export async function listMyOrders(userId, { page, pageSize }) {
  const { orders, total } = await orderRepository.findByUser(userId, { page, pageSize });
  return { orders, total, page, pageSize };
}

export async function listAllOrders({ page, pageSize, status }) {
  const { orders, total } = await orderRepository.findAll({ page, pageSize, status });
  return { orders, total, page, pageSize };
}

export async function getOrder(requester, orderId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new AppError('Pedido no encontrado', 404);
  if (requester.role !== 'ADMIN' && order.user_id !== requester.sub) {
    throw new AppError('Pedido no encontrado', 404);
  }
  return order;
}

export async function updateOrderStatus(orderId, status) {
  const order = await orderRepository.updateStatus(orderId, status);
  if (!order) throw new AppError('Pedido no encontrado', 404);
  return order;
}
