import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const isProd = env.nodeEnv === 'production';

// permite medir la capacidad real del servidor en una prueba de carga sin
// estar midiendo el propio límite; en producción siempre queda encendido
const skip = () => !env.rateLimitEnabled;

function tooManyRequests(message) {
  return { success: false, message };
}

// En el evento, todo el personal de taquilla sale por el mismo wifi, o sea la
// misma IP: contarlos juntos los bloquearía a todos en plena fila. Cuando hay
// un token válido contamos por usuario; si no, por IP (ipKeyGenerator
// normaliza IPv6 para que nadie evada el límite cambiando de sufijo).
function userOrIpKey(req, res) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      return `user:${jwt.verify(token, env.jwt.accessSecret).sub}`;
    } catch {
      // token inválido: cae al límite por IP
    }
  }
  return ipKeyGenerator(req, res);
}

// ponytail: límites relajados fuera de producción para no romper los tests
// que ejercitan estas mismas rutas repetidamente; en prod son los reales.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 300 : 5000,
  keyGenerator: userOrIpKey,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas solicitudes, probá de nuevo en unos minutos'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiados intentos, probá de nuevo en unos minutos'),
});

export const signalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 60 : 1000,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas solicitudes, probá de nuevo en un momento'),
});

// Taquilla: cada validación son varias llamadas y una persona puede escanear
// cientos de boletos en una noche, así que va aparte y contado por usuario.
export const boxOfficeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 240 : 5000,
  keyGenerator: userOrIpKey,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas operaciones seguidas, esperá unos segundos'),
});

// Apartar es público y manda correos. El límite por IP es alto porque mucha
// gente comparte salida a internet (datos móviles, wifi de escuela u oficina)
// y no queremos rechazar a asistentes reales; el freno fino es por correo.
export const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 60 : 1000,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiadas reservas desde esta conexión, probá más tarde'),
});

// Un mismo correo no debería intentar apartar decenas de veces: eso es spam
// contra esa bandeja. El cupo por persona ya vive en la base de datos; esto
// sólo corta la insistencia.
export const reservationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 12 : 1000,
  keyGenerator: (req, res) =>
    typeof req.body?.email === 'string' ? `email:${req.body.email.trim().toLowerCase()}` : ipKeyGenerator(req, res),
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests('Demasiados intentos con este correo, probá más tarde'),
});
