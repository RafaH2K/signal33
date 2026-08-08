import { cleanupExpiredTokens } from '../services/maintenanceService.js';
import { pool } from './pool.js';

cleanupExpiredTokens()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
