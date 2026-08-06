import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, env.jwt.accessSecret);
    } catch {
      // token inválido o expirado: seguimos como anónimo
    }
  }
  next();
}
