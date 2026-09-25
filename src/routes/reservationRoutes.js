import { Router } from 'express';
import * as reservationController from '../controllers/reservationController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { reservationLimiter } from '../middlewares/rateLimit.js';

export const reservationRoutes = Router();

const boxOffice = [authenticate, authorize('ADMIN', 'STAFF')];
const adminOnly = [authenticate, authorize('ADMIN')];

// públicas: disponibilidad, consultar por código de seguimiento y ver el QR
reservationRoutes.get('/availability/:eventId', reservationController.availability);
reservationRoutes.get('/track/:trackingCode', reservationController.track);
reservationRoutes.get('/mine', authenticate, reservationController.mine);
reservationRoutes.get('/tickets/:code/qr.png', reservationController.qr);

// apartar boletos: Ahora requiere autenticación de usuario
reservationRoutes.post('/', authenticate, reservationLimiter, reservationController.create);

// taquilla: personal (STAFF) y admin
reservationRoutes.get('/', ...boxOffice, reservationController.list);
reservationRoutes.get('/stats/:eventId', ...boxOffice, reservationController.stats);
reservationRoutes.get('/tickets/:code', ...boxOffice, reservationController.getTicket);
reservationRoutes.post('/tickets/:code/check-in', ...boxOffice, reservationController.checkIn);
// antes de '/:id' para que Express no lo tome como un id
reservationRoutes.get('/export.csv', ...adminOnly, reservationController.exportCsv);
reservationRoutes.get('/:id', ...boxOffice, reservationController.getOne);
reservationRoutes.patch('/:id/payment', ...boxOffice, reservationController.setPayment);
reservationRoutes.post('/:id/resend-email', ...boxOffice, reservationController.resendEmail);

// sólo admin: cancelar (exportar, también sólo admin, está arriba)
reservationRoutes.delete('/:id', ...adminOnly, reservationController.cancel);
