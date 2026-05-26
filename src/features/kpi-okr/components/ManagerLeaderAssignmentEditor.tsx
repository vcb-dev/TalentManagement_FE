import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type PerformanceAssignment } from '@/features/kpi-okr/api'
import {
  ASSIGN_TABLE_HEAD,
  AssignmentEpic4ReadCells,
  ContentCell,
  KindBadge,
  PriorityBadge,
  XL_TH,
  formatKpiSetAt,
  formatViNumber,
  xlTd,
  XL_BORDER,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'

export type AssignmentEditorHandle = { save: () => Promise<void> }

/**
 * Manager/Leader inline editor row for evaluating individual KPI/OKR assignments.
 * Extracted from LeaderReviewScreen.tsx — Epic 3.
 */
export const ManagerLeaderAssignmentEditor = forwardRef<
  AssignmentEditorHandle,
  { assignment: PerformanceAssignment; onSaved: () => void; rowStripe?: boolean }
>(function ManagerLeaderAssignmentEditor({ assignment, onSaved, rowStripe }, ref) {
  const [status, setStatus] = useState(() => assignment.managerEvalStatus?.trim() ?? '')
  const [note, setNote] = useState(() => assignment.managerReviewNote?.trim() ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(assignment.managerEvalStatus?.trim() ?? '')
    setNote(assignment.managerReviewNote?.trim() ?? '')
  }, [
    assignment.id,
    assignment.managerEvalStatus,
    assignment.managerReviewNote,
    assignment.updatedAt,
  ])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await performanceApi.patchAssignmentManager(assignment.id, {
        managerEvalStatus: status === '__none' ? null : status || null,
        managerReviewNote: note.trim() || null,
      })
      onSaved()
    } catch (err: unknown) {
      toast.error('Lỗi: ' + getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [assignment.id, status, note, onSaved])

  useImperativeHandle(ref, () => ({ save }), [save])

  return (
    <TableRow className={cn('group relative', rowStripe && 'bg-slate-50/40 dark:bg-slate-900/10')}>
      {ASSIGN_TABLE_HEAD.map((h, i) => {
        const key = h
        if (key === 'Ngày xét')
          return (
            <TableCell key={key} className={cn(XL_TH, 'tabular-nums text-slate-500')}>
              {formatKpiSetAt(assignment.kpiSetAt)}
            </TableCell>
          )
        if (key === 'Hạng mục')
          return (
            <TableCell key={key} className={XL_TH}>
              <KindBadge kind={assignment.kind} />
            </TableCell>
          )
        if (key === 'Ưu tiên')
          return (
            <TableCell key={key} className={XL_TH}>
              <PriorityBadge priority={assignment.priority} />
            </TableCell>
          )
        if (key === 'Nội dung')
          return (
            <TableCell key={key} className="py-1.5">
              <ContentCell content={assignment.content} />
            </TableCell>
          )
        if (key === 'Chỉ tiêu')
          return (
            <TableCell key={key} className={cn(XL_TH, 'tabular-nums font-semibold text-primary')}>
              {assignment.targetMetric?.trim() || '—'}
            </TableCell>
          )
        // Read-only Epic 4 cells: Số liệu, Đơn vị, Minh chứng, Tự đánh giá, Tự nhận xét
        if (['Số liệu', 'Đơn vị', 'Minh chứng', 'Tự đánh giá', 'Tự nhận xét'].includes(key))
          return <AssignmentEpic4ReadCells key={key} item={assignment} />
        if (key === 'QL đánh giá')
          return (
            <TableCell key={key} className={cn(XL_TH, 'py-0.5')}>
              <Select value={status || '__none'} onValueChange={setStatus}>
                <SelectTrigger className="h-7 w-full min-w-[88px] rounded-md border-slate-200 px-2 text-xs dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="NOT">NOT</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          )
        if (key === 'QL nhận xét')
          return (
            <TableCell key={key} className="py-0.5 md:min-w-[140px]">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={1}
                className="min-h-[28px] resize-none rounded-md border-slate-200 p-1 text-xs dark:border-slate-700"
                placeholder="Nhận xét"
              />
            </TableCell>
          )
        if (key === 'Thao tác')
          return (
            <TableCell
              key={key}
              className={cn(
                XL_TH,
                'sticky right-0 z-10 bg-white px-2 dark:bg-slate-950',
                rowStripe && 'bg-slate-50/40 dark:bg-slate-900/10',
                XL_BORDER
              )}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                disabled={saving}
                onClick={() => void save()}
              >
                <Save className="h-3 w-3" />
                {saving ? '…' : 'Lưu'}
              </Button>
            </TableCell>
          )
        return (
          <TableCell key={key} className={XL_TH}>
            —
          </TableCell>
        )
      })}
    </TableRow>
  )
})
