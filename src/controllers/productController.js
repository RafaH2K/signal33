import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '../validators/productValidator.js';
import * as productService from '../services/productService.js';
import { ok } from '../utils/response.js';

function canSeeInactive(req) {
  return req.user?.role === 'ADMIN';
}

export async function list(req, res, next) {
  try {
    const { page, pageSize, includeInactive } = listProductsQuerySchema.parse(req.query);
    const result = await productService.listProducts({
      page,
      pageSize,
      includeInactive: includeInactive && canSeeInactive(req),
    });
    ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const product = await productService.getProduct(req.params.id, {
      includeInactive: canSeeInactive(req),
    });
    ok(res, product);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await productService.createProduct(data);
    ok(res, product, 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(req.params.id, data);
    ok(res, product);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}
