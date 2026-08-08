import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimit.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
authRoutes.post('/refresh', authLimiter, authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.post('/forgot-password', authLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', authLimiter, authController.resetPassword);
authRoutes.get('/me', authenticate, authController.me);
