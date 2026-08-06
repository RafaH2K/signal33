import { fail } from '../utils/response.js';

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return fail(res, 'Acceso denegado', 403);
    next();
  };
}
