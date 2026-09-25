export const PASSWORD_SALT_ROUNDS = 12;

export function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}
