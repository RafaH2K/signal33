import { Router } from 'express';
import * as reservationController from '../controllers/reservationController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { reservationLimiter } from '../middlewares/rateLimit.js';

export const reservationRoutes = Router();

// públicas: apartar, consultar por código de seguimiento y ver el QR
reservationRoutes.post('/', reservationLimiter, reservationController.create);
reservationRoutes.get('/track/:trackingCode', reservationController.track);
reservationRoutes.get('/tickets/:code/qr.png', reservationController.qr);

// taquilla / admin
reservationRoutes.get('/', authenticate, authorize('ADMIN'), reservationController.list);
reservationRoutes.get('/stats/:eventId', authenticate, authorize('ADMIN'), reservationController.stats);
reservationRoutes.get('/tickets/:code', authenticate, authorize('ADMIN'), reservationController.getTicket);
reservationRoutes.post('/tickets/:code/check-in', authenticate, authorize('ADMIN'), reservationController.checkIn);
reservationRoutes.patch('/:id/payment', authenticate, authorize('ADMIN'), reservationController.setPayment);
reservationRoutes.delete('/:id', authenticate, authorize('ADMIN'), reservationController.cancel);
