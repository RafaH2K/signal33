import { z } from 'zod';

export const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listAllOrdersQuerySchema = listOrdersQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
