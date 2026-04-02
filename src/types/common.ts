export interface PaginationState {
  page: number
  pageSize: number
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}
