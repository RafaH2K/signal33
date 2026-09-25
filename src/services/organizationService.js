import { AppError } from '../utils/AppError.js';
import * as organizationRepository from '../repositories/organizationRepository.js';
import * as reservationRepository from '../repositories/reservationRepository.js';
import * as reservationService from './reservationService.js';
import * as uploadService from './uploadService.js';

function makeSlug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 60);
}

function requireOrganizerRole(role) {
  if (role !== 'ADMIN' && role !== 'STAFF') {
    throw new AppError('Solo las cuentas de taquilla pueden administrar eventos', 403);
  }
}

export async function listMine(userId, role) {
  requireOrganizerRole(role);
  return role === 'ADMIN'
    ? organizationRepository.findAll()
    : organizationRepository.findMine(userId);
}

export async function getPublicEvents(slug) {
  const rows = await organizationRepository.findPublicOrganizationEvents(slug);
  if (!rows.length) throw new AppError('Organización no encontrada', 404);
  const { public_organization_id, organizer_name, organization_slug } = rows[0];
  return {
    organization: { id: public_organization_id, name: organizer_name, slug: organization_slug },
    events: rows.filter((row) => row.id).map(({ public_organization_id: _id, ...event }) => event),
  };
}

export async function create({ name, userId, role }) {
  requireOrganizerRole(role);
  const base = makeSlug(name) || 'organizacion';
  let slug = base;
  let suffix = 2;
  while (await organizationRepository.findBySlug(slug)) slug = `${base}-${suffix++}`;
  return organizationRepository.create({ name: name.trim(), slug, userId });
}

async function requireMembership(organizationId, userId, role) {
  requireOrganizerRole(role);
  if (role === 'ADMIN') return { role: 'ADMIN' };
  const membership = await organizationRepository.findMembership(organizationId, userId);
  if (!membership) throw new AppError('No tienes acceso a esta organización', 403);
  return membership;
}

export async function listEvents(organizationId, userId, role) {
  await requireMembership(organizationId, userId, role);
  return organizationRepository.listEvents(organizationId);
}

export async function createEvent(organizationId, userId, role, data) {
  await requireMembership(organizationId, userId, role);
  return organizationRepository.createEvent({ organizationId, data });
}

export async function uploadCover(organizationId, userId, role, file) {
  await requireMembership(organizationId, userId, role);
  if (!file) throw new AppError('Selecciona una imagen para subir', 400);
  if (!file.mimetype.startsWith('image/')) throw new AppError('El archivo debe ser una imagen', 400);
  return uploadService.saveFile(file);
}

export async function updateEvent(organizationId, eventId, userId, role, data) {
  await requireMembership(organizationId, userId, role);
  const event = await organizationRepository.updateEvent(organizationId, eventId, data);
  if (!event) throw new AppError('Evento no encontrado', 404);
  return event;
}

export async function deleteEvent(organizationId, eventId, userId, role) {
  await requireMembership(organizationId, userId, role);
  if (!await organizationRepository.deleteEvent(organizationId, eventId)) {
    throw new AppError('Evento no encontrado', 404);
  }
}

export async function listReservations(organizationId, userId, role, eventId) {
  await requireMembership(organizationId, userId, role);
  return organizationRepository.listReservations(organizationId, eventId);
}

export async function setReservationPaid(organizationId, reservationId, userId, role, isPaid) {
  await requireMembership(organizationId, userId, role);
  const reservation = await organizationRepository.findReservation(organizationId, reservationId);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  await reservationRepository.setPaid(reservationId, isPaid, userId);
  return reservationService.getReservationDetail(reservationId);
}

export async function checkIn(organizationId, userId, role, code) {
  await requireMembership(organizationId, userId, role);
  const ticket = await reservationService.getTicketByCode(code);
  const reservation = await organizationRepository.findReservation(organizationId, ticket.reservation_id);
  if (!reservation) throw new AppError('Boleto no encontrado', 404);
  return reservationService.checkInTicket(code, userId);
}
