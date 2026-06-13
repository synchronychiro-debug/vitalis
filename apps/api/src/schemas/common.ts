import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParam = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParam>;
