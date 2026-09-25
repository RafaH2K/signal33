import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://tickets.findyourfrequency.com.mx',
  'https://findyourfrequency.com.mx',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const FYF_DOMAIN_REGEX = /^https:\/\/([a-z0-9-]+\.)?findyourfrequency\.com\.mx$/;

export const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
      env.corsAllowedOrigins.includes(origin) ||
      FYF_DOMAIN_REGEX.test(origin)
    ) {
      callback(null, true);
      return;
    }
    callback(new AppError('No permitido por CORS', 403));
  },
  credentials: true,
  // el frontend lee el nombre del archivo al descargar el CSV de reservas
  exposedHeaders: ['Content-Disposition'],
};
