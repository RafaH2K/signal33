import { AppError } from '../utils/AppError.js';
import { generateTicketCode, generateTrackingCode } from '../utils/codes.js';
import * as reservationRepository from '../repositories/reservationRepository.js';
import * as eventRepository from '../repositories/eventRepository.js';
import * as emailQueueService from './emailQueueService.js';

const PRICE_COLUMN = { GENERAL: 'price_general', OPEN_BAR: 'price_open_bar' };
const CAPACITY_COLUMN = { GENERAL: 'capacity_general', OPEN_BAR: 'capacity_open_bar' };
const ACCESS_LABEL = { GENERAL: 'acceso general', OPEN_BAR: 'barra libre' };

async function getBookableEvent(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event || !event.reservations_enabled) throw new AppError('Este evento no acepta reservas', 404);
  return event;
}

// lo que ve el público antes de apartar: precios y cuántos quedan de cada tipo
export async function getAvailability(eventId) {
  const event = await getBookableEvent(eventId);
  const reserved = await reservationRepository.reservedByAccessType(eventId);

  const accessTypes = Object.keys(PRICE_COLUMN).map((type) => {
    const capacity = event[CAPACITY_COLUMN[type]];
    return {
      type,
      price: Number(event[PRICE_COLUMN[type]]),
      remaining: capacity === null ? null : Math.max(0, capacity - (reserved[type] ?? 0)),
    };
  });

  return {
    eventId: event.id,
    maxAccessesPerPerson: event.max_accesses_per_person,
    isOpen: new Date(event.event_date) > new Date(),
    accessTypes,
  };
}

export async function createReservation({ eventId, fullName, email, accessType, quantity }) {
  const event = await getBookableEvent(eventId);
  if (new Date(event.event_date) < new Date()) throw new AppError('El evento ya pasó', 400);

  const limit = event.max_accesses_per_person;
  if (quantity > limit) throw new AppError(`Máximo ${limit} accesos por persona`, 400);

  const result = await reservationRepository.createWithTickets({
    event,
    trackingCode: generateTrackingCode(),
    fullName,
    email,
    accessType,
    quantity,
    unitPrice: event[PRICE_COLUMN[accessType]],
    ticketCodes: Array.from({ length: quantity }, generateTicketCode),
  });

  if (result.rejected === 'EVENT_FULL') {
    throw new AppError(
      result.remaining === 0
        ? `Se agotó ${ACCESS_LABEL[accessType]}`
        : `Sólo quedan ${result.remaining} lugar(es) de ${ACCESS_LABEL[accessType]}`,
      409
    );
  }
  if (result.rejected === 'PERSON_LIMIT') {
    const remaining = Math.max(0, limit - result.alreadyReserved);
    throw new AppError(
      remaining === 0
        ? `Ya apartaste el máximo de ${limit} accesos con este correo`
        : `Con este correo sólo podés apartar ${remaining} acceso(s) más`,
      409
    );
  }

  const { reservation, tickets } = result;
  // el correo sale por la cola: la respuesta no espera al proveedor y, si
  // falla, se reintenta solo en vez de perderse
  emailQueueService.kick();

  return { ...reservation, tickets };
}

export async function trackReservation(trackingCode) {
  const reservation = await reservationRepository.findByTrackingCode(trackingCode);
  if (!reservation || reservation.cancelled_at) throw new AppError('Reserva no encontrada', 404);
  const tickets = await reservationRepository.findTickets(reservation.id);
  // el público no necesita saber qué empleado cobró
  const { paid_by: _paidBy, paid_by_name: _paidByName, ...publicReservation } = reservation;
  return { ...publicReservation, tickets };
}

async function getActiveReservation(id) {
  const reservation = await reservationRepository.findById(id);
  if (!reservation || reservation.cancelled_at) throw new AppError('Reserva no encontrada', 404);
  return reservation;
}

export async function getReservationDetail(id) {
  const reservation = await getActiveReservation(id);
  const [tickets, logs] = await Promise.all([
    reservationRepository.findTickets(id),
    reservationRepository.findLogs(id),
  ]);
  return { ...reservation, tickets, logs };
}

export async function getTicketByCode(code) {
  const ticket = await reservationRepository.findTicketByCode(code);
  if (!ticket || ticket.cancelled_at) throw new AppError('Boleto no encontrado o cancelado', 404);
  return ticket;
}

export async function checkInTicket(code, userId) {
  const ticket = await getTicketByCode(code);
  if (!ticket.is_paid) throw new AppError('No está pagado: cobrá antes de dejar pasar', 409);
  if (ticket.checked_in_at) throw new AppError('Este acceso ya fue usado', 409);

  const checkedIn = await reservationRepository.checkInTicket(code, userId);
  // perdió la carrera contra otro lector: alguien más acaba de usar el mismo QR
  if (!checkedIn) throw new AppError('Este acceso ya fue usado', 409);

  return getTicketByCode(code);
}

export async function listReservations(params) {
  const { reservations, total } = await reservationRepository.findAll(params);
  return { reservations, total, page: params.page, pageSize: params.pageSize };
}

export async function setPaymentStatus(id, isPaid, userId) {
  // setPaid no toca nada si ya estaba en ese estado (dos personas tocaron el
  // botón a la vez): eso es éxito, así que siempre respondemos con el estado
  // actual, y getActiveReservation da 404 si no existe o está cancelada
  await reservationRepository.setPaid(id, isPaid, userId);
  return getActiveReservation(id);
}

export async function cancelReservation(id, userId) {
  const reservation = await reservationRepository.cancel(id, userId);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  return reservation;
}

export async function resendEmail(id, userId) {
  await getActiveReservation(id);
  await reservationRepository.requeueEmail(id);
  await reservationRepository.logAction(id, 'EMAIL_RESENT', userId);
  emailQueueService.kick();
  return { queued: true };
}

export async function getEventStats(eventId) {
  const event = await eventRepository.findById(eventId, { includeInactive: true });
  if (!event) throw new AppError('Evento no encontrado', 404);

  const { byType, checkedIn, byStaff } = await reservationRepository.eventStats(eventId);
  const types = Object.keys(PRICE_COLUMN).map((type) => {
    const row = byType.find((r) => r.access_type === type);
    return {
      type,
      capacity: event[CAPACITY_COLUMN[type]],
      reserved: row?.reserved ?? 0,
      paid: row?.paid ?? 0,
      collected: Number(row?.collected ?? 0),
      pending: Number(row?.pending ?? 0),
    };
  });

  const sum = (key) => types.reduce((total, t) => total + t[key], 0);
  return {
    reserved: sum('reserved'),
    paid: sum('paid'),
    collected: sum('collected'),
    pending: sum('pending'),
    checkedIn,
    byType: types,
    byStaff: byStaff.map((s) => ({ ...s, collected: Number(s.collected) })),
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // comillas siempre + neutraliza fórmulas (=, +, -, @) al abrirlo en Excel
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function exportCsv(eventId) {
  const rows = await reservationRepository.findAllForExport(eventId);
  const header = ['Nombre', 'Correo', 'Seguimiento', 'Acceso', 'Cantidad', 'Monto', 'Pagado', 'Cobró', 'Entraron', 'Códigos QR'];
  const lines = rows.map((r) =>
    [
      r.full_name,
      r.email,
      r.tracking_code,
      r.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General',
      r.quantity,
      r.amount_due,
      r.is_paid ? 'Sí' : 'No',
      r.paid_by_name,
      `${r.checked_in}/${r.quantity}`,
      r.ticket_codes,
    ]
      .map(csvCell)
      .join(',')
  );
  // BOM para que Excel respete los acentos
  return `﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}`;
}
