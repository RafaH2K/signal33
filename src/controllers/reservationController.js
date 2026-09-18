import {
  createReservationSchema,
  trackingCodeSchema,
  ticketCodeSchema,
  setPaymentSchema,
  listReservationsQuerySchema,
} from '../validators/reservationValidator.js';
import * as reservationService from '../services/reservationService.js';
import { renderQrPng, ticketQrPayload } from '../services/qrService.js';
import { env } from '../config/env.js';
import { ok } from '../utils/response.js';

export async function create(req, res, next) {
  try {
    const data = createReservationSchema.parse(req.body);
    const reservation = await reservationService.createReservation(data);
    ok(res, reservation, 201);
  } catch (error) {
    next(error);
  }
}

export async function track(req, res, next) {
  try {
    const code = trackingCodeSchema.parse(req.params.trackingCode);
    ok(res, await reservationService.trackReservation(code));
  } catch (error) {
    next(error);
  }
}

export async function qr(req, res, next) {
  try {
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
  } catch (error) {
    next(error);
  }
}

export async function getTicket(req, res, next) {
  try {
    const code = ticketCodeSchema.parse(req.params.code);
    ok(res, await reservationService.getTicketByCode(code));
  } catch (error) {
    next(error);
  }
}

export async function checkIn(req, res, next) {
  try {
    const code = ticketCodeSchema.parse(req.params.code);
    ok(res, await reservationService.checkInTicket(code, req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const params = listReservationsQuerySchema.parse(req.query);
    ok(res, await reservationService.listReservations(params));
  } catch (error) {
    next(error);
  }
}

export async function setPayment(req, res, next) {
  try {
    const { isPaid } = setPaymentSchema.parse(req.body);
    ok(res, await reservationService.setPaymentStatus(req.params.id, isPaid));
  } catch (error) {
    next(error);
  }
}

export async function cancel(req, res, next) {
  try {
    ok(res, await reservationService.cancelReservation(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function stats(req, res, next) {
  try {
    ok(res, await reservationService.getEventStats(req.params.eventId));
  } catch (error) {
    next(error);
  }
}
