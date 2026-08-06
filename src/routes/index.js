import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { userRoutes } from './userRoutes.js';
import { productRoutes } from './productRoutes.js';
import { cartRoutes } from './cartRoutes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/products', productRoutes);
routes.use('/cart', cartRoutes);
