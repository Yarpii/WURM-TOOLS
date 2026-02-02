// ========== PAGINATION TYPES ==========

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// SECURITY: Default and maximum limits to prevent DoS
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

export function validatePagination(params?: PaginationParams): { offset: number; limit: number; page: number } {
  const page = Math.max(1, Math.floor(params?.page || 1));
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(params?.limit || DEFAULT_PAGE_LIMIT)));
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}
