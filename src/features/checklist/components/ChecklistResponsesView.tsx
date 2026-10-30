import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Eye, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { foldSearch, formatChecklistTime, personName } from '../checklistAnswers'
import { downloadChecklistResponsesExcel } from '../exportChecklistResponses'
import { useChecklistTemplateResponses } from '../hooks'
import { CHECKLIST_KIND_LABEL } from '../types'
import {
  ChecklistResponseDialog,
  type ChecklistResponseDialogTarget,
} from './ChecklistResponseDialog'

type StatusFilter = 'all' | 'done' | 'pending'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'done', label: 'Đã điền' },
  { value: 'pending', label: 'Chưa điền' },
]

/** Admin: tình trạng điền checklist của từng nhân sự trong team áp dụng + xem / xuất câu trả lời. */
export function ChecklistResponsesView({
  templateId,
  onBack,
}: {
  templateId: string
  onBack: () => void
}) {
  const { data, isLoading } = useChecklistTemplateResponses(templateId)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState<ChecklistResponseDialogTarget | null>(null)
  const [exporting, setExporting] = useState(false)

  const rows = useMemo(() => data?.rows ?? [], [data])
  const inScope = rows.filter((r) => r.inScope)
  const doneInScope = inScope.filter((r) => r.responses.length > 0).length
  const responseTotal = rows.reduce((n, r) => n + r.responses.length, 0)

  const visible = useMemo(() => {
    const needle = foldSearch(q.trim())
    return rows.filter((r) => {
      if (status === 'done' && r.responses.length === 0) return false
      if (status === 'pending' && r.responses.length > 0) return false
      if (!needle) return true
      return foldSearch(
        [r.subject.fullNameLegal, r.subject.email, r.subject.employeeIdentifier, r.subject.teamName]
          .filter(Boolean)
          .join(' ')
      ).includes(needle)
    })
  }, [rows, status, q])

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const { template } = data
  const isLeaderKind = template.kind === 'LEADER'
  const pct = inScope.length > 0 ? Math.round((doneInScope / inScope.length) * 100) : 0

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadChecklistResponsesExcel(data)
    } catch {
      toast.error('Không thể xuất file Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Danh sách checklist
      </Button>

      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{template.title}</h2>
            <Badge variant="outline" className="text-xs">
              {CHECKLIST_KIND_LABEL[template.kind]}
            </Badge>
            {!template.isActive ? (
              <Badge variant="muted" className="text-xs">
                Ngừng sử dụng
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {template.teams.length > 0
              ? `Team: ${template.teams.map((t) => t.name).join(', ')}`
              : 'Chưa gán team'}
          </p>
          {template.isActive ? (
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-button" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {doneInScope}/{inScope.length}
                </span>{' '}
                nhân sự đã có câu trả lời
              </span>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void exportExcel()}
          disabled={exporting || responseTotal === 0}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Xuất Excel ({responseTotal})
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex w-fit gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-sm"
          role="tablist"
          aria-label="Lọc trạng thái"
        >
          {STATUS_TABS.map((t) => (
            <Button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              variant={status === t.value ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-lg text-xs', status !== t.value && 'text-muted-foreground')}
              onClick={() => setStatus(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, mã, team…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân sự</TableHead>
              <TableHead>Team</TableHead>
              {isLeaderKind ? <TableHead>Trưởng nhóm phụ trách</TableHead> : null}
              <TableHead>Câu trả lời</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.subject.id} className="align-top">
                <TableCell>
                  <p className="font-medium text-foreground">{personName(row.subject)}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.subject.employeeIdentifier ?? row.subject.email}
                  </p>
                  {!row.inScope ? (
                    <Badge variant="muted" className="mt-1 px-1.5 py-0 text-[11px]">
                      Không còn thuộc team áp dụng
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{row.subject.teamName ?? '—'}</TableCell>
                {isLeaderKind ? (
                  <TableCell className="text-sm">
                    {row.subject.teamLeader ? (
                      personName(row.subject.teamLeader)
                    ) : (
                      <span className="text-xs font-medium text-warning">Chưa gán trưởng nhóm</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell>
                  {row.responses.length === 0 ? (
                    <span className="text-xs font-medium text-warning">Chưa điền</span>
                  ) : (
                    <ul className="space-y-1">
                      {row.responses.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2"
                            onClick={() =>
                              setViewing({
                                title: template.title,
                                questions: template.questions,
                                subject: row.subject,
                                response: r,
                              })
                            }
                          >
                            <Eye className="size-3.5" aria-hidden />
                            Xem
                          </Button>
                          <span className="text-muted-foreground">
                            {isLeaderKind ? `${personName(r.respondent)} · ` : null}
                            {formatChecklistTime(r.updatedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isLeaderKind ? 4 : 3}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0
                    ? 'Chưa có nhân sự nào trong team áp dụng.'
                    : 'Không có nhân sự khớp bộ lọc.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <ChecklistResponseDialog target={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
