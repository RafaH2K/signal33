import { addItemSchema, updateItemSchema } from '../validators/cartValidator.js';
import * as cartService from '../services/cartService.js';
import { ok } from '../utils/response.js';

export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.sub);
    ok(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function addItem(req, res, next) {
  try {
    const data = addItemSchema.parse(req.body);
    const cart = await cartService.addItem(req.user.sub, data);
    ok(res, cart, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { quantity } = updateItemSchema.parse(req.body);
    const cart = await cartService.updateItemQuantity(req.user.sub, req.params.productId, quantity);
    ok(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req, res, next) {
  try {
    const cart = await cartService.removeItem(req.user.sub, req.params.productId);
    ok(res, cart);
  } catch (error) {
    next(error);
  }
}
