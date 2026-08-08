import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import * as signalController from '../controllers/signalController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate, authorize('ADMIN'));

dashboardRoutes.get('/summary', dashboardController.getSummary);

dashboardRoutes.get('/signals', signalController.list);
dashboardRoutes.post('/signals', signalController.create);
dashboardRoutes.patch('/signals/:id', signalController.update);
dashboardRoutes.delete('/signals/:id', signalController.remove);
