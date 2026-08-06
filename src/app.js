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

export const app = express();

app.use(
  helmet({
    hsts: env.nodeEnv === 'production',
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);
