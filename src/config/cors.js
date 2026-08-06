import { env } from './env.js';

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
