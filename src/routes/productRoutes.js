import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { optionalAuthenticate } from '../middlewares/optionalAuthenticate.js';

export const productRoutes = Router();

productRoutes.get('/', optionalAuthenticate, productController.list);
productRoutes.get('/:id', optionalAuthenticate, productController.getOne);
productRoutes.post('/', authenticate, authorize('ADMIN'), productController.create);
productRoutes.patch('/:id', authenticate, authorize('ADMIN'), productController.update);
productRoutes.delete('/:id', authenticate, authorize('ADMIN'), productController.remove);
