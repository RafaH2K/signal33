import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const isProd = env.nodeEnv === 'production';

function tooManyRequests(message) {
  return { success: false, message };
}

// Azure App Service manda X-Forwarded-For como "ip:puerto". Sin quitar el
// puerto, cada conexión TCP sería un cliente distinto y el límite no limitaría nada.
export const clientKey = (req) => ipKeyGenerator(req.ip.replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1'));

// ponytail: límites relajados fuera de producción para no romper los tests
// que ejercitan estas mismas rutas repetidamente; en prod son los reales.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: tooManyRequests('Demasiadas solicitudes, intenta de nuevo en unos minutos'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: tooManyRequests('Demasiados intentos, intenta de nuevo en unos minutos'),
});

export const signalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: tooManyRequests('Demasiadas solicitudes, intenta de nuevo en un momento'),
});

// apartar es público y manda correos: límite estricto por IP para que nadie
// use el formulario para spamear bandejas ajenas
export const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: tooManyRequests('Demasiadas reservas desde esta conexión, intenta más tarde'),
});
