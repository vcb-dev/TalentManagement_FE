import { useCallback, useState } from 'react'
import type { PaginationState } from '@/types/common'

const defaultState: PaginationState = { page: 1, pageSize: 20 }

export function usePagination(initial: Partial<PaginationState> = {}) {
  const [state, setState] = useState<PaginationState>({ ...defaultState, ...initial })

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setState({ page: 1, pageSize })
  }, [])

  const reset = useCallback(() => setState({ ...defaultState, ...initial }), [initial])

  return { ...state, setPage, setPageSize, reset, setState }
}
