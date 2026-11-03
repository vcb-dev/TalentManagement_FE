import { useMemo, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatViDate } from '@/lib/date'
import { foldSearch, formatChecklistAnswer, personName } from '../checklistAnswers'
import type { OverviewRow } from '../checklistOverview'
import type { OverviewPeopleTarget } from './ChecklistOverviewCharts'

const SEARCH_FROM = 8

function PeopleList({
  target,
  rowsById,
  onView,
}: {
  target: OverviewPeopleTarget
  rowsById: Map<string, OverviewRow>
  onView: (row: OverviewRow) => void
}) {
  const [q, setQ] = useState('')
  const people = useMemo(
    () =>
      target.subjectIds.flatMap((id) => {
        const row = rowsById.get(id)
        return row ? [row] : []
      }),
    [target, rowsById]
  )
  const needle = foldSearch(q.trim())
  const shown = needle
    ? people.filter((r) =>
        foldSearch(
          [
            r.subject.fullNameLegal,
            r.subject.email,
            r.subject.employeeIdentifier,
            r.subject.teamName,
          ]
            .filter(Boolean)
            .join(' ')
        ).includes(needle)
      )
    : people

  return (
    <div className="space-y-3">
      {people.length >= SEARCH_FROM ? (
        <div className="relative">
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
      ) : null}
      <ul className="divide-y divide-border/70 rounded-xl border border-border/80">
        {shown.map((row) => {
          const answer =
            target.detail && row.response
              ? formatChecklistAnswer(target.detail, row.response.answers[target.detail.id])
              : ''
          return (
            <li key={row.subject.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{personName(row.subject)}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    row.subject.employeeIdentifier ?? row.subject.email,
                    row.subject.teamName,
                    row.subject.startDateWork
                      ? `vào làm ${formatViDate(row.subject.startDateWork)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {answer ? (
                  <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/85">{answer}</p>
                ) : null}
              </div>
              {row.response ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1"
                  onClick={() => onView(row)}
                >
                  <Eye className="size-3.5" aria-hidden />
                  Xem
                </Button>
              ) : null}
            </li>
          )
        })}
        {shown.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Không có nhân sự khớp tìm kiếm.
          </li>
        ) : null}
      </ul>
    </div>
  )
}

/** Những nhân sự đứng sau một con số trên trang tổng quan → mở bản trả lời của từng người. */
export function ChecklistPeopleDialog({
  target,
  rowsById,
  onClose,
  onView,
}: {
  target: OverviewPeopleTarget | null
  rowsById: Map<string, OverviewRow>
  onClose: () => void
  onView: (row: OverviewRow) => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug">{target.title}</DialogTitle>
              <DialogDescription>
                {target.description} · {target.subjectIds.length} nhân sự
              </DialogDescription>
            </DialogHeader>
            <PeopleList
              key={target.title + target.description}
              target={target}
              rowsById={rowsById}
              onView={onView}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
