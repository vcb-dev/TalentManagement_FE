export interface PaginationState {
  page: number
  pageSize: number
  /** Tổng số trang (từ API hoặc tính từ total / pageSize). */
  totalPages?: number
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}
