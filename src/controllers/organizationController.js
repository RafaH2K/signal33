import { z } from 'zod';
import * as organizationService from '../services/organizationService.js';
import { createEventSchema, updateEventSchema } from '../validators/eventValidator.js';
import { ok } from '../utils/response.js';

const organizationId = z.string().uuid();
const eventId = z.string().uuid();
const createOrganizationSchema = z.object({ name: z.string().trim().min(2).max(120) });
const paymentSchema = z.object({ isPaid: z.boolean() });
const codeSchema = z.string().min(6).max(40);

function handle(fn) {
  return async (req, res, next) => {
    try { await fn(req, res); } catch (error) { next(error); }
  };
}

export const listMine = handle(async (req, res) => {
  ok(res, await organizationService.listMine(req.user.sub, req.user.role));
});

export const publicEvents = handle(async (req, res) => {
  ok(res, await organizationService.getPublicEvents(z.string().min(1).max(80).parse(req.params.slug)));
});

export const create = handle(async (req, res) => {
  const { name } = createOrganizationSchema.parse(req.body);
  ok(res, await organizationService.create({ name, userId: req.user.sub, role: req.user.role }), 201);
});

export const listEvents = handle(async (req, res) => {
  ok(res, await organizationService.listEvents(organizationId.parse(req.params.organizationId), req.user.sub, req.user.role));
});

export const createEvent = handle(async (req, res) => {
  const data = createEventSchema.parse(req.body);
  ok(res, await organizationService.createEvent(organizationId.parse(req.params.organizationId), req.user.sub, req.user.role, data), 201);
});

export const uploadCover = handle(async (req, res) => {
  ok(res, await organizationService.uploadCover(
    organizationId.parse(req.params.organizationId), req.user.sub, req.user.role, req.file
  ), 201);
});

export const updateEvent = handle(async (req, res) => {
  const data = updateEventSchema.parse(req.body);
  ok(res, await organizationService.updateEvent(
    organizationId.parse(req.params.organizationId), eventId.parse(req.params.eventId), req.user.sub, req.user.role, data
  ));
});

export const deleteEvent = handle(async (req, res) => {
  await organizationService.deleteEvent(
    organizationId.parse(req.params.organizationId), eventId.parse(req.params.eventId), req.user.sub, req.user.role
  );
  ok(res, null);
});

export const listReservations = handle(async (req, res) => {
  const filterEventId = req.query.eventId ? eventId.parse(req.query.eventId) : undefined;
  ok(res, await organizationService.listReservations(
    organizationId.parse(req.params.organizationId), req.user.sub, req.user.role, filterEventId
  ));
});

export const setPayment = handle(async (req, res) => {
  const { isPaid } = paymentSchema.parse(req.body);
  ok(res, await organizationService.setReservationPaid(
    organizationId.parse(req.params.organizationId), eventId.parse(req.params.reservationId), req.user.sub, req.user.role, isPaid
  ));
});

export const checkIn = handle(async (req, res) => {
  ok(res, await organizationService.checkIn(
    organizationId.parse(req.params.organizationId), req.user.sub, req.user.role, codeSchema.parse(req.params.code)
  ));
});

export const resendEmail = handle(async (req, res) => {
  ok(res, await organizationService.resendEmail(
    organizationId.parse(req.params.organizationId), eventId.parse(req.params.reservationId), req.user.sub, req.user.role
  ));
});
