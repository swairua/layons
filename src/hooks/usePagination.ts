import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

interface UsePaginationResult<T> {
  // Current state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Paginated data
  paginatedItems: T[];

  // Handler functions
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (count: number) => void;

  // Reset functions
  resetPage: () => void;
  resetPagination: () => void;
}

export const usePagination = <T extends unknown>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> => {
  const { initialPageSize = 10 } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return items.slice(startIdx, endIdx);
  }, [items, currentPage, pageSize]);

  // Reset to page 1 when page size changes and we'd be beyond the new total
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    // Reset to page 1 to avoid being on a page that doesn't exist
    setCurrentPage(1);
  };

  // Ensure current page is valid
  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  const resetPagination = () => {
    setCurrentPage(1);
    setPageSize(initialPageSize);
  };

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setCurrentPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    setTotalItems: () => {}, // This is handled by items prop length
    resetPage,
    resetPagination,
  };
};
