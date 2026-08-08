import { Router } from 'express';
import * as aboutController from '../controllers/aboutController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const aboutRoutes = Router();

aboutRoutes.get('/', aboutController.getOne);
aboutRoutes.patch('/', authenticate, authorize('ADMIN'), aboutController.update);
