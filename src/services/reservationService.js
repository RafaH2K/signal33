import { AppError } from '../utils/AppError.js';
import { generateTicketCode, generateTrackingCode } from '../utils/codes.js';
import * as reservationRepository from '../repositories/reservationRepository.js';
import * as eventRepository from '../repositories/eventRepository.js';
import * as ticketTypeRepository from '../repositories/ticketTypeRepository.js';
import * as emailService from './emailService.js';
import { logger } from '../config/logger.js';

async function getBookableEvent(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event || !event.reservations_enabled) throw new AppError('Este evento no acepta reservas', 404);
  return event;
}

// lo que ve el público antes de apartar: precios y cuántos quedan de cada tipo
export async function getAvailability(eventId) {
  const event = await getBookableEvent(eventId);
  const [ticketTypes, reserved] = await Promise.all([
    ticketTypeRepository.findActiveByEvent(eventId),
    reservationRepository.reservedByTicketType(eventId),
  ]);
  const generalType = ticketTypes[0];
  const barType = ticketTypes.find((type) => type.name === 'Barra libre');
  return {
    eventId: event.id,
    maxAccessesPerPerson: event.max_accesses_per_person,
    isOpen: new Date(event.event_date) > new Date(),
    ticketTypes: ticketTypes.map((type) => ({
      id: type.id,
      name: type.name,
      price: Number(type.price),
      remaining: type.capacity === null ? null : Math.max(0, type.capacity - (reserved[type.id] ?? 0)),
    })),
    // Compatibilidad con el frontend anterior, que todavía usa GENERAL/OPEN_BAR.
    accessTypes: [
      {
        type: 'GENERAL',
        price: Number(generalType?.price ?? event.price_general),
        remaining: generalType?.capacity == null
          ? null
          : Math.max(0, generalType.capacity - (reserved[generalType.id] ?? 0)),
      },
      ...(barType || Number(event.price_open_bar) > 0 || event.capacity_open_bar != null
        ? [{
          type: 'OPEN_BAR',
          price: Number(barType?.price ?? event.price_open_bar ?? 0),
          remaining: (barType?.capacity ?? event.capacity_open_bar) == null
            ? null
            : Math.max(0, (barType?.capacity ?? event.capacity_open_bar) - (barType ? reserved[barType.id] ?? 0 : 0)),
        }]
        : []),
    ],
  };
}

export async function createReservation({ eventId, fullName, email, ticketTypeId, accessType, quantity, userId }) {
  const event = await getBookableEvent(eventId);
  if (new Date(event.event_date) < new Date()) throw new AppError('El evento ya pasó', 400);
  const limit = event.max_accesses_per_person;
  if (quantity > limit) throw new AppError(`Máximo ${limit} boletos por persona`, 400);
  const ticketType = ticketTypeId
    ? await ticketTypeRepository.findActiveById(eventId, ticketTypeId)
    : await ticketTypeRepository.findActiveLegacy(eventId, accessType);
  if (!ticketType) throw new AppError('Este precio ya no está disponible', 404);

  const result = await reservationRepository.createWithTickets({
    event,
    ticketType,
    trackingCode: generateTrackingCode(),
    fullName,
    email,
    accessType: ticketTypeId ? 'GENERAL' : accessType,
    quantity,
    ticketCodes: Array.from({ length: quantity }, generateTicketCode),
    userId,
  });

  if (result.rejected === 'EVENT_FULL') {
    throw new AppError(
      result.remaining === 0
        ? `Se agotaron los boletos de ${ticketType.name}`
        : `Solo quedan ${result.remaining} boleto(s) de ${ticketType.name}`,
      409
    );
  }

  if (result.rejected === 'PERSON_LIMIT') {
    const remaining = Math.max(0, limit - result.alreadyReserved);
    throw new AppError(
      remaining === 0
        ? `Tu cuenta ya apartó el máximo de ${limit} boletos`
        : `Con tu cuenta puedes apartar ${remaining} boleto(s) más`,
      409
    );
  }

  const { reservation, tickets } = result;
  await sendEmail({ ...reservation, event_title: event.title, event_date: event.event_date, venue: event.venue }, tickets);
  return { ...reservation, tickets };
}
// el correo nunca debe tumbar la reserva: ya quedó apartada y el código de
// seguimiento se muestra en pantalla aunque el envío falle
async function sendEmail(reservation, tickets) {
  try {
    await emailService.sendReservationEmail({ reservation, tickets });
    return true;
  } catch (error) {
    logger.error({ error, reservationId: reservation.id }, 'Reservation email failed');
    return false;
  }
}

export async function trackReservation(trackingCode) {
  const reservation = await reservationRepository.findByTrackingCode(trackingCode);
  if (!reservation || reservation.cancelled_at) throw new AppError('Reserva no encontrada', 404);
  const tickets = await reservationRepository.findTickets(reservation.id);
  const { tracking_code, full_name, access_type, ticket_type_name, quantity, amount_due, is_paid,
    event_title, event_date, venue } = reservation;
  return {
    tracking_code, full_name, access_type, ticket_type_name, quantity, amount_due, is_paid,
    event_title, event_date, venue,
    tickets: tickets.map(({ id, code }) => ({ id, code })),
  };
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
  if (!ticket.is_paid) throw new AppError('No está pagado: cobra antes de dejar pasar', 409);
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
  await reservationRepository.setPaid(id, isPaid, userId);
  return getActiveReservation(id);
}

export async function cancelReservation(id, userId) {
  const reservation = await reservationRepository.cancel(id, userId);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  return reservation;
}

export async function resendEmail(id, userId) {
  const reservation = await getActiveReservation(id);
  const tickets = await reservationRepository.findTickets(id);
  const sent = await sendEmail(reservation, tickets);
  if (!sent) throw new AppError('No se pudo enviar el correo, revisa la configuración de Resend', 502);
  await reservationRepository.logAction(id, 'EMAIL_RESENT', userId);
  return { sent: true };
}

export async function resendEmailByTracking(trackingCode) {
  const reservation = await reservationRepository.findByTrackingCode(trackingCode);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  const tickets = await reservationRepository.findTickets(reservation.id);
  const sent = await sendEmail(reservation, tickets);
  if (!sent) throw new AppError('No se pudo enviar el correo, revisa la configuración de Resend', 502);
  await reservationRepository.logAction(reservation.id, 'EMAIL_RESENT', null);
  return { sent: true, email: reservation.email };
}

export async function getEventStats(eventId) {
  const event = await eventRepository.findById(eventId, { includeInactive: true });
  if (!event) throw new AppError('Evento no encontrado', 404);
  const [stats, ticketTypes] = await Promise.all([
    reservationRepository.eventStats(eventId),
    ticketTypeRepository.findAllByEvent(eventId),
  ]);
  const { byType, checkedIn, byStaff } = stats;
  const types = ticketTypes.map((type) => {
    const row = byType.find((r) => r.ticket_type_id === type.id);
    return {
      id: type.id,
      type: type.name,
      capacity: type.capacity,
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
      r.ticket_type_name || (r.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General'),
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
  return `\uFEFF${[header.map(csvCell).join(','), ...lines].join('\r\n')}`;
}

export async function listMyReservations(userId) {
  return reservationRepository.findAllForUser(userId);
}
