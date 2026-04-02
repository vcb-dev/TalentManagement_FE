import { formatViDate } from '@/lib/date'

export interface WorkHistoryEntry {
  id: string
  title: string
  from: string
  to?: string
}

export interface WorkHistoryTimelineProps {
  entries: WorkHistoryEntry[]
}

export function WorkHistoryTimeline({ entries }: WorkHistoryTimelineProps) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {entries.map((e) => (
        <li key={e.id} className="ml-1">
          <div className="text-sm font-medium">{e.title}</div>
          <div className="text-xs text-muted-foreground">
            {formatViDate(e.from)} — {e.to ? formatViDate(e.to) : 'nay'}
          </div>
        </li>
      ))}
    </ol>
  )
}
