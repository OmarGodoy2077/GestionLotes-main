/// Tipos compartidos por todos los módulos.

/// Parámetros estándar de paginación.
export type PaginationParams = {
  page: number;
  limit: number;
};

/// Respuesta paginada genérica.
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/// Helper para construir la metadata de paginación.
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginatedResponse<unknown>["pagination"] {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
