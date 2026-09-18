import {
  createReservationSchema,
  trackingCodeSchema,
  ticketCodeSchema,
  setPaymentSchema,
  listReservationsQuerySchema,
  idParamSchema,
  eventIdQuerySchema,
} from '../validators/reservationValidator.js';
import * as reservationService from '../services/reservationService.js';
import { renderQrPng, ticketQrPayload } from '../services/qrService.js';
import { env } from '../config/env.js';
import { ok } from '../utils/response.js';

// envoltorio para no repetir try/catch en cada handler
function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export const create = handle(async (req, res) => {
  const data = createReservationSchema.parse(req.body);
  ok(res, await reservationService.createReservation(data), 201);
});

export const availability = handle(async (req, res) => {
  ok(res, await reservationService.getAvailability(idParamSchema.parse(req.params.eventId)));
});

export const track = handle(async (req, res) => {
  ok(res, await reservationService.trackReservation(trackingCodeSchema.parse(req.params.trackingCode)));
});

export const qr = handle(async (req, res) => {
  const code = ticketCodeSchema.parse(req.params.code);
  // confirma que exista antes de dibujar: no queremos servir QR de códigos inventados
  await reservationService.getTicketByCode(code);
  const png = await renderQrPng(ticketQrPayload(env.frontendUrl, code));
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400',
    // los clientes de correo cargan la imagen desde otro origen
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.send(png);
});

export const getTicket = handle(async (req, res) => {
  ok(res, await reservationService.getTicketByCode(ticketCodeSchema.parse(req.params.code)));
});

export const checkIn = handle(async (req, res) => {
  ok(res, await reservationService.checkInTicket(ticketCodeSchema.parse(req.params.code), req.user.sub));
});

export const list = handle(async (req, res) => {
  ok(res, await reservationService.listReservations(listReservationsQuerySchema.parse(req.query)));
});

export const getOne = handle(async (req, res) => {
  ok(res, await reservationService.getReservationDetail(idParamSchema.parse(req.params.id)));
});

export const setPayment = handle(async (req, res) => {
  const { isPaid } = setPaymentSchema.parse(req.body);
  ok(res, await reservationService.setPaymentStatus(idParamSchema.parse(req.params.id), isPaid, req.user.sub));
});

export const cancel = handle(async (req, res) => {
  ok(res, await reservationService.cancelReservation(idParamSchema.parse(req.params.id), req.user.sub));
});

export const resendEmail = handle(async (req, res) => {
  ok(res, await reservationService.resendEmail(idParamSchema.parse(req.params.id), req.user.sub));
});

export const stats = handle(async (req, res) => {
  ok(res, await reservationService.getEventStats(idParamSchema.parse(req.params.eventId)));
});

export const exportCsv = handle(async (req, res) => {
  const { eventId } = eventIdQuerySchema.parse(req.query);
  const csv = await reservationService.exportCsv(eventId);
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="reservas-${eventId.slice(0, 8)}.csv"`,
  });
  res.send(csv);
});
