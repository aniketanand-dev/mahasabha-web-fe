export interface PaginatedItems<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
}

export const clampPage = (page: number, totalItems: number, pageSize: number): number => {
  const safePageSize = Math.max(1, Math.trunc(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));
  const safePage = Math.trunc(page) || 1;

  return Math.min(Math.max(1, safePage), totalPages);
};

export const paginateItems = <T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedItems<T> => {
  const total = items.length;
  const safePageSize = Math.max(1, Math.trunc(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = clampPage(page, total, safePageSize);
  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = Math.min(total, startIndex + safePageSize);

  return {
    items: items.slice(startIndex, endIndex),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    start: total ? startIndex + 1 : 0,
    end: endIndex,
  };
};
