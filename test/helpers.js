import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';

export { assert };

export function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, base: `http://localhost:${server.address().port}/api` });
    });
  });
}

export function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

export function closePool() {
  return pool.end();
}

export function uniqueEmail(prefix) {
  return `${prefix}-${randomUUID()}@example.com`;
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export function jsonHeaders(token) {
  return token ? { 'Content-Type': 'application/json', ...authHeader(token) } : { 'Content-Type': 'application/json' };
}

export async function registerUser(base, { name = 'Test User', email, password = 'supersecret123' }) {
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  return { status: res.status, body: await res.json() };
}

export async function login(base, email, password = 'supersecret123') {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerAndLogin(base, prefix) {
  const email = uniqueEmail(prefix);
  await registerUser(base, { email });
  const { data } = await login(base, email);
  return { email, token: data.accessToken, refreshToken: data.refreshToken, userId: data.user.id };
}

export async function registerAdmin(base, prefix) {
  const account = await registerAndLogin(base, prefix);
  await promoteToAdmin(account.email);
  const { data } = await login(base, account.email);
  return { ...account, token: data.accessToken, refreshToken: data.refreshToken };
}

export function promoteToAdmin(email) {
  return pool.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [email]);
}

export function deleteUsersByEmail(...emails) {
  if (emails.length === 0) return Promise.resolve();
  return pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
}
