import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as userRepository from '../repositories/userRepository.js';
import * as refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import * as passwordResetTokenRepository from '../repositories/passwordResetTokenRepository.js';
import { sendPasswordResetEmail } from './emailService.js';
import { PASSWORD_SALT_ROUNDS, sanitizeUser } from '../utils/user.js';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function signTokens(user) {
  const payload = { sub: user.id, role: user.role, jti: randomUUID() };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
  return { accessToken, refreshToken };
}

export async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new AppError('El correo ya está registrado', 409);

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await userRepository.create({ name, email, passwordHash });
  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError('Credenciales inválidas', 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Credenciales inválidas', 401);

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function issueTokens(user) {
  const { accessToken, refreshToken } = signTokens(user);
  const decoded = jwt.decode(refreshToken);
  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });
  return { accessToken, refreshToken };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokenRepository.findValidByHash(tokenHash);
  if (!stored) throw new AppError('Refresh token inválido o expirado', 401);

  const user = await userRepository.findById(payload.sub);
  if (!user) throw new AppError('Refresh token inválido o expirado', 401);

  await refreshTokenRepository.revokeByHash(tokenHash);
  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(refreshToken) {
  await refreshTokenRepository.revokeByHash(hashToken(refreshToken));
}

export async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) return; // no revelar si el correo existe

  const rawToken = randomBytes(32).toString('hex');
  await passwordResetTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token, newPassword) {
  const stored = await passwordResetTokenRepository.findValidByHash(hashToken(token));
  if (!stored) throw new AppError('Token inválido o expirado', 400);

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await userRepository.updatePassword(stored.user_id, passwordHash);
  await passwordResetTokenRepository.markUsed(stored.id);
}

export async function me(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitizeUser(user);
}
