import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return fail(res, 'No autorizado', 401);

  try {
    req.user = jwt.verify(token, env.jwt.accessSecret);
    next();
  } catch {
    return fail(res, 'Token inválido o expirado', 401);
  }
}
