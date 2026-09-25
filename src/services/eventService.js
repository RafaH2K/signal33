import { AppError } from '../utils/AppError.js';
import * as eventRepository from '../repositories/eventRepository.js';
import * as uploadService from './uploadService.js';

export async function listEvents({ page, pageSize, includeInactive }) {
  const { events, total } = await eventRepository.findAll({ page, pageSize, includeInactive });
  return { events, total, page, pageSize };
}

export async function getEvent(id, { includeInactive } = {}) {
  const event = await eventRepository.findById(id, { includeInactive });
  if (!event) throw new AppError('Evento no encontrado', 404);
  return event;
}

export async function createEvent(data) {
  const ticketTypes = data.ticketTypes ?? [
    { name: 'General', price: data.priceGeneral ?? 0, capacity: data.capacityGeneral ?? null },
    ...(data.priceOpenBar > 0 || data.capacityOpenBar != null
      ? [{ name: 'Barra libre', price: data.priceOpenBar ?? 0, capacity: data.capacityOpenBar ?? null }]
      : []),
  ];
  return eventRepository.create({ ...data, ticketTypes });
}

export async function updateEvent(id, data) {
  const existing = await eventRepository.findById(id, { includeInactive: true });
  if (!existing) throw new AppError('Evento no encontrado', 404);

  const event = await eventRepository.update(id, data);

  if (data.coverImageUrl && data.coverImageUrl !== existing.cover_image_url) {
    await uploadService.deleteFileIfManaged(existing.cover_image_url);
  }

  return event;
}

export async function deleteEvent(id) {
  const deleted = await eventRepository.softDelete(id);
  if (!deleted) throw new AppError('Evento no encontrado', 404);
}
