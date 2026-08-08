import { Router } from 'express';
import * as signalController from '../controllers/signalController.js';
import { signalLimiter } from '../middlewares/rateLimit.js';

export const signalRoutes = Router();

signalRoutes.get('/:command', signalLimiter, signalController.resolve);
