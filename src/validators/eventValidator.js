import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.coerce.date(),
  venue: z.string().min(2).max(200),
  coverImageUrl: z.string().url().optional(),
  ticketUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  reservationsEnabled: z.boolean().optional(),
  maxAccessesPerPerson: z.coerce.number().int().min(1).max(10).optional(),
  priceGeneral: z.coerce.number().min(0).max(1_000_000).optional(),
  priceOpenBar: z.coerce.number().min(0).max(1_000_000).optional(),
  // null = sin límite
  capacityGeneral: z.coerce.number().int().min(0).nullable().optional(),
  capacityOpenBar: z.coerce.number().int().min(0).nullable().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeInactive: z.coerce.boolean().default(false),
});
