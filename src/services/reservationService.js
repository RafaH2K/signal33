import { AppError } from '../utils/AppError.js';
import { generateTicketCode, generateTrackingCode } from '../utils/codes.js';
import * as reservationRepository from '../repositories/reservationRepository.js';
import * as eventRepository from '../repositories/eventRepository.js';
import * as emailService from './emailService.js';
import { logger } from '../config/logger.js';

export async function createReservation({ eventId, fullName, email, accessType, quantity }) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw new AppError('Evento no encontrado', 404);
  if (!event.reservations_enabled) throw new AppError('Este evento no acepta reservas', 400);
  if (new Date(event.event_date) < new Date()) throw new AppError('El evento ya pasó', 400);

  const limit = event.max_accesses_per_person;
  const { reservation, tickets, alreadyReserved } = await reservationRepository.createWithTickets({
    eventId,
    trackingCode: generateTrackingCode(),
    fullName,
    email,
    accessType,
    quantity,
    ticketCodes: Array.from({ length: quantity }, generateTicketCode),
    maxAccesses: limit,
  });

  if (!reservation) {
    const remaining = Math.max(0, limit - alreadyReserved);
    throw new AppError(
      remaining === 0
        ? `Ya apartaste el máximo de ${limit} accesos con este correo`
        : `Con este correo sólo podés apartar ${remaining} acceso(s) más`,
      409
    );
  }

  // el correo no debe tumbar la reserva: ya quedó apartada y el código de
  // seguimiento se devuelve en la respuesta aunque el envío falle
  try {
    await emailService.sendReservationEmail({
      reservation: { ...reservation, event_title: event.title, event_date: event.event_date, venue: event.venue },
      tickets,
    });
  } catch (error) {
    logger.error({ error, reservationId: reservation.id }, 'Reservation email failed');
  }

  return { ...reservation, tickets };
}

export async function trackReservation(trackingCode) {
  const reservation = await reservationRepository.findByTrackingCode(trackingCode);
  if (!reservation || reservation.cancelled_at) throw new AppError('Reserva no encontrada', 404);
  const tickets = await reservationRepository.findTickets(reservation.id);
  return { ...reservation, tickets };
}

export async function getTicketByCode(code) {
  const ticket = await reservationRepository.findTicketByCode(code);
  if (!ticket || ticket.cancelled_at) throw new AppError('Boleto no encontrado', 404);
  return ticket;
}

export async function checkInTicket(code, userId) {
  const ticket = await getTicketByCode(code);
  if (!ticket.is_paid) throw new AppError('La reserva no está pagada: cobrá en taquilla antes de dejar pasar', 409);
  if (ticket.checked_in_at) throw new AppError('Este acceso ya fue usado', 409);

  const checkedIn = await reservationRepository.checkInTicket(code, userId);
  // perdió la carrera contra otro lector: alguien más acaba de usar el mismo QR
  if (!checkedIn) throw new AppError('Este acceso ya fue usado', 409);

  return { ...ticket, checked_in_at: checkedIn.checked_in_at, checked_in_by: checkedIn.checked_in_by };
}

export async function listReservations({ eventId, isPaid, search, page, pageSize }) {
  const { reservations, total } = await reservationRepository.findAll({ eventId, isPaid, search, page, pageSize });
  return { reservations, total, page, pageSize };
}

export async function setPaymentStatus(id, isPaid) {
  const reservation = await reservationRepository.setPaid(id, isPaid);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  return reservation;
}

export async function cancelReservation(id) {
  const reservation = await reservationRepository.cancel(id);
  if (!reservation) throw new AppError('Reserva no encontrada', 404);
  return reservation;
}

export async function getEventStats(eventId) {
  const event = await eventRepository.findById(eventId, { includeInactive: true });
  if (!event) throw new AppError('Evento no encontrado', 404);
  return reservationRepository.eventStats(eventId);
}
