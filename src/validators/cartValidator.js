import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1),
});
