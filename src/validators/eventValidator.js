import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.coerce.date(),
  venue: z.string().min(2).max(200),
  coverImageUrl: z.string().url().optional(),
  ticketUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeInactive: z.coerce.boolean().default(false),
});
