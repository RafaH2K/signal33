import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './database/pool.js';
import { cleanupExpiredTokens } from './services/maintenanceService.js';

const TOKEN_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const server = app.listen(env.port, () => {
  logger.info(`Server running on ${env.appUrl || `http://localhost:${env.port}`}`);
});

// ponytail: un solo timer en proceso alcanza para una instancia; si el día
// de mañana corren varias instancias, mover esto a un cron externo con
// `pnpm run tokens:cleanup` para no duplicar el trabajo.
const cleanupTimer = setInterval(() => {
  cleanupExpiredTokens().catch((error) => logger.error({ error }, 'Falló el cleanup periódico de tokens'));
}, TOKEN_CLEANUP_INTERVAL_MS);

function shutdown(signal) {
  logger.info(`${signal} recibido, cerrando el servidor...`);
  clearInterval(cleanupTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
