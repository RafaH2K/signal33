import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError('No permitido por CORS', 403));
  },
  credentials: true,
};
