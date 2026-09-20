import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  appUrl: process.env.APP_URL,
  frontendUrl: process.env.FRONTEND_URL,

  db: {
    host: required('DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT) || 5432,
    database: required('DATABASE_NAME'),
    user: required('DATABASE_USER'),
    password: required('DATABASE_PASSWORD'),
    ssl: process.env.DATABASE_SSL === 'true',
    poolMax: Number(process.env.DATABASE_POOL_MAX) || 20,
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  resend: {
    apiKey: required('RESEND_API_KEY'),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  },

  email: {
    // cuántos correos se mandan a la vez: subirlo sólo si tu plan lo permite
    queueConcurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 2,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    bucket: process.env.STORAGE_BUCKET,
    apiKey: process.env.STORAGE_API_KEY,
  },

  // sólo para pruebas de carga contra un entorno aislado: nunca en producción
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',

  logLevel: process.env.LOG_LEVEL || 'info',
};
