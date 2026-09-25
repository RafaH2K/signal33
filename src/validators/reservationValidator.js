import { z } from 'zod';

export const createReservationSchema = z.object({
  eventId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  ticketTypeId: z.string().uuid().optional(),
  accessType: z.enum(['GENERAL', 'OPEN_BAR']).optional(),
  // el tope real por persona lo decide el evento; esto sólo corta basura obvia
  quantity: z.coerce.number().int().min(1).max(10),
}).refine((value) => value.ticketTypeId || value.accessType, {
  message: 'Selecciona un tipo de boleto',
  path: ['ticketTypeId'],
});

export const trackingCodeSchema = z.string().trim().toUpperCase().regex(/^SR-[2-9A-Z]{8}$/);

export const ticketCodeSchema = z.string().trim().toUpperCase().regex(/^[2-9A-Z]{16}$/);

export const setPaymentSchema = z.object({
  isPaid: z.boolean(),
});

export const listReservationsQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  isPaid: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const idParamSchema = z.string().uuid();

export const eventIdQuerySchema = z.object({ eventId: z.string().uuid() });
