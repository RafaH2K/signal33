import { Router } from 'express';
import * as controller from '../controllers/organizationController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { upload } from '../middlewares/upload.js';

export const organizationRoutes = Router();

organizationRoutes.get('/public/:slug/events', controller.publicEvents);
organizationRoutes.use(authenticate);
organizationRoutes.get('/', controller.listMine);
organizationRoutes.post('/', controller.create);
organizationRoutes.get('/:organizationId/events', controller.listEvents);
organizationRoutes.post('/:organizationId/events', controller.createEvent);
organizationRoutes.post('/:organizationId/uploads', upload.single('file'), controller.uploadCover);
organizationRoutes.patch('/:organizationId/events/:eventId', controller.updateEvent);
organizationRoutes.delete('/:organizationId/events/:eventId', controller.deleteEvent);
organizationRoutes.get('/:organizationId/reservations', controller.listReservations);
organizationRoutes.patch('/:organizationId/reservations/:reservationId/payment', controller.setPayment);
organizationRoutes.post('/:organizationId/reservations/:reservationId/resend-email', controller.resendEmail);
organizationRoutes.post('/:organizationId/tickets/:code/check-in', controller.checkIn);
