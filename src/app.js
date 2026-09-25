import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { corsOptions } from './config/cors.js';
import { routes } from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimit.js';

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads');

export const app = express();

// detrás de un proxy/load balancer (Railway, Render, etc.) hace falta esto para
// que req.ip sea la IP real del visitante y no la del proxy — si no, el rate
// limiting trata a todos los visitantes como una sola IP.
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    hsts: env.nodeEnv === 'production',
  })
);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

// archivos públicos (imágenes/videos): CORP cross-origin para que el frontend
// (dominio distinto) pueda embeberlos, a diferencia de las respuestas JSON de la API
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsDir)
);

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);
