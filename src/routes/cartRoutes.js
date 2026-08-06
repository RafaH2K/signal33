import { Router } from 'express';
import * as cartController from '../controllers/cartController.js';
import { authenticate } from '../middlewares/authenticate.js';

export const cartRoutes = Router();

cartRoutes.use(authenticate);

cartRoutes.get('/', cartController.getCart);
cartRoutes.post('/items', cartController.addItem);
cartRoutes.patch('/items/:productId', cartController.updateItem);
cartRoutes.delete('/items/:productId', cartController.removeItem);
