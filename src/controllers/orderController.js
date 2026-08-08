import {
  listOrdersQuerySchema,
  listAllOrdersQuerySchema,
  updateStatusSchema,
} from '../validators/orderValidator.js';
import * as orderService from '../services/orderService.js';
import { ok } from '../utils/response.js';

export async function create(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user.sub);
    ok(res, order, 201);
  } catch (error) {
    next(error);
  }
}

export async function listMine(req, res, next) {
  try {
    const { page, pageSize } = listOrdersQuerySchema.parse(req.query);
    const result = await orderService.listMyOrders(req.user.sub, { page, pageSize });
    ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function listAll(req, res, next) {
  try {
    const { page, pageSize, status } = listAllOrdersQuerySchema.parse(req.query);
    const result = await orderService.listAllOrders({ page, pageSize, status });
    ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const order = await orderService.getOrder(req.user, req.params.id);
    ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const order = await orderService.updateOrderStatus(req.params.id, status);
    ok(res, order);
  } catch (error) {
    next(error);
  }
}
