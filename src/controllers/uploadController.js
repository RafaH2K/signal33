import * as uploadService from '../services/uploadService.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/response.js';

export async function upload(req, res, next) {
  try {
    if (!req.file) throw new AppError('No se envió ningún archivo', 400);
    const result = await uploadService.saveFile(req.file);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const files = await uploadService.listFiles();
    ok(res, files);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await uploadService.deleteFile(req.params.filename);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}
