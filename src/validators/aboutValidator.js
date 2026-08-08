import { z } from 'zod';

export const updateAboutSchema = z.object({
  story: z.string().max(10000).optional(),
  bio: z.string().max(10000).optional(),
  influences: z.string().max(2000).optional(),
  career: z.string().max(10000).optional(),
});
