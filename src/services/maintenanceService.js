import { logger } from '../config/logger.js';
import * as refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import * as passwordResetTokenRepository from '../repositories/passwordResetTokenRepository.js';

export async function cleanupExpiredTokens() {
  const [refreshTokensDeleted, resetTokensDeleted] = await Promise.all([
    refreshTokenRepository.deleteExpired(),
    passwordResetTokenRepository.deleteExpired(),
  ]);
  logger.info({ refreshTokensDeleted, resetTokensDeleted }, 'Cleanup de tokens expirados');
  return { refreshTokensDeleted, resetTokensDeleted };
}
