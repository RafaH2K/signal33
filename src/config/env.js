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
  ticketsUrl: process.env.TICKETS_URL || 'https://tickets.findyourfrequency.com.mx',

  db: {
    host: required('DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT) || 5432,
    database: required('DATABASE_NAME'),
    user: required('DATABASE_USER'),
    password: required('DATABASE_PASSWORD'),
    ssl: process.env.DATABASE_SSL === 'true',
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
    fromEmail: process.env.RESEND_FROM_EMAIL || 'FYF Tickets <tickets@findyourfrequency.com.mx>',
  },

  googleWallet: {
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID,
    serviceAccountEmail: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_WALLET_PRIVATE_KEY ? process.env.GOOGLE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    bucket: process.env.STORAGE_BUCKET,
    apiKey: process.env.STORAGE_API_KEY,
    azureConnectionString:
      process.env.STORAGE_PROVIDER === 'azure' ? required('AZURE_STORAGE_CONNECTION_STRING') : undefined,
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};
