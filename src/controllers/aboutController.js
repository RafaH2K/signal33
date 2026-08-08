import { updateAboutSchema } from '../validators/aboutValidator.js';
import * as aboutService from '../services/aboutService.js';
import { ok } from '../utils/response.js';

export async function getOne(req, res, next) {
  try {
    const about = await aboutService.getAbout();
    ok(res, about);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateAboutSchema.parse(req.body);
    const about = await aboutService.updateAbout(data);
    ok(res, about);
  } catch (error) {
    next(error);
  }
}
