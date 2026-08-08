import * as dashboardService from '../services/dashboardService.js';
import { ok } from '../utils/response.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getSummary();
    ok(res, summary);
  } catch (error) {
    next(error);
  }
}
