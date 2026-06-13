export interface PageArgs {
  page: number;
  limit: number;
  skip: number;
}

export function resolvePage(query: { page?: number; limit?: number }): PageArgs {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
