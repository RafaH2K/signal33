import { z } from 'zod';

export const createGallerySchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().url(),
  title: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().optional(),
});

export const updateGallerySchema = createGallerySchema.partial();

export const listGalleryQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

export const reorderGallerySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.coerce.number().int(),
      })
    )
    .min(1),
});
