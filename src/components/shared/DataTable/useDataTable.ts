import { useMemo, useState } from 'react'

export interface UseDataTableState {
  page: number
  pageSize: number
}

export function useDataTable(initial: Partial<UseDataTableState> = {}) {
  const [page, setPage] = useState(initial.page ?? 1)
  const [pageSize, setPageSize] = useState(initial.pageSize ?? 20)

  const pagination = useMemo(() => ({ page, pageSize, setPage, setPageSize }), [page, pageSize])

  return pagination
}
