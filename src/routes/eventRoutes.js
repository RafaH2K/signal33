import { Router } from 'express';
import * as eventController from '../controllers/eventController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { optionalAuthenticate } from '../middlewares/optionalAuthenticate.js';

export const eventRoutes = Router();

eventRoutes.get('/', optionalAuthenticate, eventController.list);
eventRoutes.get('/:id', optionalAuthenticate, eventController.getOne);
eventRoutes.post('/', authenticate, authorize('ADMIN'), eventController.create);
eventRoutes.patch('/:id', authenticate, authorize('ADMIN'), eventController.update);
eventRoutes.delete('/:id', authenticate, authorize('ADMIN'), eventController.remove);
