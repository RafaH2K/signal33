import { fail } from '../utils/response.js';

export function notFound(req, res) {
  fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
