import { HeadcountSummary } from './HeadcountSummary'
import { useBodHeadcount } from '@/features/bod/hooks'

export function HeadcountSummaryContainer() {
  const q = useBodHeadcount()
  if (!q.data) return null
  return <HeadcountSummary data={q.data} />
}

export { HeadcountSummary }
