import {
  updateProfileSchema,
  changePasswordSchema,
  listUsersQuerySchema,
} from '../validators/userValidator.js';
import * as userService from '../services/userService.js';
import { ok } from '../utils/response.js';

export async function getMe(req, res, next) {
  try {
    const user = await userService.getProfile(req.user.sub);
    ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.user.sub, data);
    ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function changeMyPassword(req, res, next) {
  try {
    const data = changePasswordSchema.parse(req.body);
    await userService.changePassword(req.user.sub, data);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { page, pageSize } = listUsersQuerySchema.parse(req.query);
    const result = await userService.listUsers({ page, pageSize });
    ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}
