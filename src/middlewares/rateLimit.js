import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isProd = env.nodeEnv === 'production';

function tooManyRequests(message) {
  return { success: false, message };
}

// ponytail: límites relajados fuera de producción para no romper los tests
// que ejercitan estas mismas rutas repetidamente; en prod son los reales.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas solicitudes, probá de nuevo en unos minutos'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiados intentos, probá de nuevo en unos minutos'),
});

export const signalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas solicitudes, probá de nuevo en un momento'),
});
