import { Router } from 'express';
import * as galleryController from '../controllers/galleryController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { optionalAuthenticate } from '../middlewares/optionalAuthenticate.js';

export const galleryRoutes = Router();

galleryRoutes.get('/', optionalAuthenticate, galleryController.list);
galleryRoutes.patch('/reorder', authenticate, authorize('ADMIN'), galleryController.reorder);
galleryRoutes.get('/:id', optionalAuthenticate, galleryController.getOne);
galleryRoutes.post('/', authenticate, authorize('ADMIN'), galleryController.create);
galleryRoutes.patch('/:id', authenticate, authorize('ADMIN'), galleryController.update);
galleryRoutes.delete('/:id', authenticate, authorize('ADMIN'), galleryController.remove);
