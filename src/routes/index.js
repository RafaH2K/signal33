import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { userRoutes } from './userRoutes.js';
import { productRoutes } from './productRoutes.js';
import { cartRoutes } from './cartRoutes.js';
import { orderRoutes } from './orderRoutes.js';
import { galleryRoutes } from './galleryRoutes.js';
import { aboutRoutes } from './aboutRoutes.js';
import { eventRoutes } from './eventRoutes.js';
import { uploadRoutes } from './uploadRoutes.js';
import { dashboardRoutes } from './dashboardRoutes.js';
import { signalRoutes } from './signalRoutes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/products', productRoutes);
routes.use('/cart', cartRoutes);
routes.use('/orders', orderRoutes);
routes.use('/gallery', galleryRoutes);
routes.use('/about', aboutRoutes);
routes.use('/events', eventRoutes);
routes.use('/uploads', uploadRoutes);
routes.use('/dashboard', dashboardRoutes);
routes.use('/signal', signalRoutes);
