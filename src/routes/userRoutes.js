import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const userRoutes = Router();

userRoutes.use(authenticate);

userRoutes.get('/me', userController.getMe);
userRoutes.patch('/me', userController.updateMe);
userRoutes.patch('/me/password', userController.changeMyPassword);

userRoutes.get('/', authorize('ADMIN'), userController.listUsers);
userRoutes.get('/:id', authorize('ADMIN'), userController.getUserById);
userRoutes.delete('/:id', authorize('ADMIN'), userController.deleteUser);
