import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError.js';
import * as userRepository from '../repositories/userRepository.js';

const SALT_ROUNDS = 12;

function sanitize(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

export async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitize(user);
}

export async function updateProfile(userId, data) {
  if (data.email) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing && existing.id !== userId) throw new AppError('El correo ya está en uso', 409);
  }
  const user = await userRepository.updateProfile(userId, data);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitize(user);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('Contraseña actual incorrecta', 401);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepository.updatePassword(userId, passwordHash);
}

export async function listUsers({ page, pageSize }) {
  const { users, total } = await userRepository.findAll({ page, pageSize });
  return { users: users.map(sanitize), total, page, pageSize };
}

export async function getUserById(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitize(user);
}

export async function deleteUser(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  await userRepository.softDelete(id);
}

export async function updateRole(id, role, requesterId) {
  // un admin quitándose el rol a sí mismo puede dejar el sitio sin admins
  if (id === requesterId && role !== 'ADMIN') throw new AppError('No podés quitarte tu propio rol de admin', 400);
  const user = await userRepository.updateRole(id, role);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return sanitize(user);
}
