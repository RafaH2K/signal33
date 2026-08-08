import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
} from '../validators/eventValidator.js';
import * as eventService from '../services/eventService.js';
import { ok } from '../utils/response.js';

function canSeeInactive(req) {
  return req.user?.role === 'ADMIN';
}

export async function list(req, res, next) {
  try {
    const { page, pageSize, includeInactive } = listEventsQuerySchema.parse(req.query);
    const result = await eventService.listEvents({
      page,
      pageSize,
      includeInactive: includeInactive && canSeeInactive(req),
    });
    ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const event = await eventService.getEvent(req.params.id, { includeInactive: canSeeInactive(req) });
    ok(res, event);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(data);
    ok(res, event, 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(req.params.id, data);
    ok(res, event);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await eventService.deleteEvent(req.params.id);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}
