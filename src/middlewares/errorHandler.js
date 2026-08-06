import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { fail } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return fail(res, err.issues[0]?.message || 'Datos inválidos', 400);
  }

  if (err instanceof AppError) {
    return fail(res, err.message, err.statusCode);
  }

  logger.error({ err }, 'Unhandled error');
  return fail(res, 'Error interno del servidor', 500);
}
