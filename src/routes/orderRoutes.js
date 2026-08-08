import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const orderRoutes = Router();

orderRoutes.use(authenticate);

orderRoutes.post('/', orderController.create);
orderRoutes.get('/', orderController.listMine);
orderRoutes.get('/all', authorize('ADMIN'), orderController.listAll);
orderRoutes.get('/:id', orderController.getOne);
orderRoutes.patch('/:id/status', authorize('ADMIN'), orderController.updateStatus);
