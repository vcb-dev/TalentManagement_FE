import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import {
  performanceApi,
  type ApprovalRequest,
  type ApprovalRequestType,
  type PerformanceAssignment,
  type PerformanceKind,
} from '@/features/kpi-okr/api'
import {
  EvalStatusBadge,
  GoalReviewStatusBadge,
  GoalReviewSummary,
  formatViNumber,
} from '@/features/kpi-okr/components/kpiAssignmentTableShared'
import {
  EvidenceImagePreviews,
  evidenceImageUrlsFromText,
  evidenceTextWithoutUploadPaths,
} from '@/features/kpi-okr/components/KpiEvidenceInput'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { SECTION_FADE_UP, CARD_ENTRANCE } from '@/lib/cardMotion'
import { isMockApiEnabled } from '@/lib/mockEnv'

function nowYm() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

function ApprovalStatusBadge({ status }: { status: ApprovalRequest['status'] }) {
  if (status === 'pending')
    return (
      <Badge className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
        <Clock className="h-3 w-3" />
        Chờ duyệt
      </Badge>
    )
  if (status === 'approved')
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
        <CheckCircle2 className="h-3 w-3" />
        Đã duyệt
      </Badge>
    )
  return (
    <Badge className="gap-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
      <X className="h-3 w-3" />
      Từ chối
    </Badge>
  )
}

// ── Inline KPI viewer (expandable inside team card, no modal) ──

function formatKpiSetAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

function PriorityText({ priority }: { priority: number }) {
  if (priority === 1) return <span className="font-semibold text-rose-600 text-xs">P1 - Cao</span>
  if (priority === 2) return <span className="font-semibold text-amber-600 text-xs">P2 - TB</span>
  if (priority === 3) return <span className="font-semibold text-slate-500 text-xs">P3 - Thấp</span>
  return <span className="text-xs text-slate-400">—</span>
}

function TeamResultInline({
  teamId,
  year,
  month,
  requestStatus,
  onEvaluationsChange,
}: {
  teamId: string
  year: number
  month: number
  requestStatus: ApprovalRequest['status']
  onEvaluationsChange?: (
    evals: { assignmentId: string; status: 'OK' | 'NOT' }[],
    allEvaluated: boolean
  ) => void
}) {
  const assignmentsQ = useQuery({
    queryKey: ['kpi-assignments-result', teamId, year, month],
    queryFn: () => performanceApi.listAssignments(teamId, year, month),
    enabled: !isMockApiEnabled(),
  })

  const [evalMap, setEvalMap] = useState<Record<string, 'OK' | 'NOT'>>({})

  const assignments = assignmentsQ.data ?? []

  useEffect(() => {
    if (assignments.length > 0) {
      const initialMap: Record<string, 'OK' | 'NOT'> = {}
      for (const a of assignments) {
        if (a.finalEvalStatus === 'OK' || a.finalEvalStatus === 'NOT') {
          initialMap[a.id] = a.finalEvalStatus as 'OK' | 'NOT'
        }
      }
      setEvalMap(initialMap)
    }
  }, [assignments])

  useEffect(() => {
    if (onEvaluationsChange && assignments.length > 0) {
      const evals = assignments
        .filter((a) => evalMap[a.id] === 'OK' || evalMap[a.id] === 'NOT')
        .map((a) => ({
          assignmentId: a.id,
          status: evalMap[a.id] as 'OK' | 'NOT',
        }))
      const allEvaluated = assignments.every(
        (a) => evalMap[a.id] === 'OK' || evalMap[a.id] === 'NOT'
      )
      onEvaluationsChange(evals, allEvaluated)
    }
  }, [assignments, evalMap, onEvaluationsChange])

  const handleStatusChange = (assignmentId: string, status: string) => {
    const nextMap = { ...evalMap }
    if (status === '__none' || !status) {
      delete nextMap[assignmentId]
    } else {
      nextMap[assignmentId] = status as 'OK' | 'NOT'
    }
    setEvalMap(nextMap)
  }

  if (assignmentsQ.isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (assignments.length === 0) {
    return <p className="p-3 text-center text-xs text-slate-400">Chưa có kết quả KPI/OKR nào.</p>
  }

  const grouped: { userId: string; name: string; items: PerformanceAssignment[] }[] = []
  for (const a of assignments) {
    const last = grouped[grouped.length - 1]
    if (last && last.userId === a.assigneeUserId) {
      last.items.push(a)
    } else {
      grouped.push({
        userId: a.assigneeUserId,
        name: a.assigneeDisplayName ?? a.assigneeUserId,
        items: [a],
      })
    }
  }

  const resultTableHead = [
    'Ngày xét',
    'Hạng mục',
    'Ưu tiên',
    'Nội dung',
    'Chỉ tiêu',
    'Số liệu',
    'Đơn vị',
    'Minh chứng',
    'Tự đánh giá',
    'Nhận xét NV',
    'Đánh giá Leader',
    'Đánh giá Manager',
  ] as const

  return (
    <div className="px-3 pb-3 space-y-4">
      {grouped.map((g) => (
        <div key={g.userId} className="rounded-lg border overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{g.name}</span>
            <span className="text-xs text-slate-400">({g.items.length} kết quả)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  {resultTableHead.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.items.map((a) => {
                  const displayEv = evidenceTextWithoutUploadPaths(a.evidence)
                  const hasImagePreviews = evidenceImageUrlsFromText(a.evidence).length > 0
                  return (
                    <tr
                      key={a.id}
                      className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-2.5 py-2 tabular-nums text-slate-500">
                        {formatKpiSetAt(a.kpiSetAt)}
                      </td>
                      <td className="px-2.5 py-2">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold',
                            a.kind === 'KPI'
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                              : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
                          )}
                        >
                          {a.kind}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <PriorityText priority={a.priority} />
                      </td>
                      <td className="px-2.5 py-2 max-w-[280px] whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {a.content}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                        {a.targetMetric?.trim() || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                        {formatViNumber(a.numericValue)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-xs uppercase text-slate-600">
                        {a.numericUnit?.trim() || '—'}
                      </td>
                      <td className="max-w-[160px] min-w-[120px] px-2.5 py-2">
                        {displayEv ? (
                          <span className="line-clamp-3 whitespace-pre-wrap break-all text-slate-600">
                            {displayEv}
                          </span>
                        ) : hasImagePreviews ? null : (
                          <span className="text-slate-400">—</span>
                        )}
                        <EvidenceImagePreviews
                          evidence={a.evidence}
                          maxHeightClass="h-12 max-w-[72px]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <EvalStatusBadge status={a.selfEvalStatus ?? null} type="self" />
                      </td>
                      <td className="max-w-[200px] px-2.5 py-2 text-slate-600 dark:text-slate-300">
                        {a.selfReviewNote?.trim() ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">
                            {a.selfReviewNote}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <div className="flex flex-col gap-1">
                          <EvalStatusBadge status={a.managerEvalStatus ?? null} type="leader" />
                          {a.managerReviewNote?.trim() && (
                            <span
                              className="text-[10px] text-slate-400 block max-w-[120px] truncate"
                              title={a.managerReviewNote}
                            >
                              {a.managerReviewNote}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        {requestStatus === 'pending' ? (
                          <Select
                            value={evalMap[a.id] || '__none'}
                            onValueChange={(v) => handleStatusChange(a.id, v)}
                          >
                            <SelectTrigger className="h-8 w-20 rounded-md border-slate-200">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">—</SelectItem>
                              <SelectItem value="OK">OK</SelectItem>
                              <SelectItem value="NOT">NOT</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <EvalStatusBadge status={a.finalEvalStatus ?? null} type="manager" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

type ApprovalGoalEditDraft = {
  priority: number
  content: string
  targetMetric: string
}

function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-xs leading-relaxed">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ApprovalGoalActionCell({
  requestId,
  assignment,
  onChanged,
}: {
  requestId: string
  assignment: PerformanceAssignment
  onChanged: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approving, setApproving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [draft, setDraft] = useState<ApprovalGoalEditDraft>({
    priority: assignment.priority,
    content: assignment.content,
    targetMetric: assignment.targetMetric ?? '',
  })
  const reviewStatus = assignment.goalReview?.status ?? 'pending'
  const isTerminal =
    reviewStatus === 'approved' ||
    reviewStatus === 'edit_confirmed' ||
    reviewStatus === 'manager_created_confirmed' ||
    reviewStatus === 'rejected'
  const isWaitingMember =
    reviewStatus === 'edit_pending_member' || reviewStatus === 'manager_created_pending_member'
  const busy = approving || saving || deleting
  const processedTooltip =
    reviewStatus === 'approved'
      ? 'KPI/OKR này đã được Manager duyệt.'
      : reviewStatus === 'edit_confirmed'
        ? 'Member đã xác nhận nội dung sửa cho KPI/OKR này.'
        : reviewStatus === 'rejected'
          ? 'KPI/OKR này đã bị Manager từ chối.'
          : ''
  const waitingMemberTooltip = 'Đang chờ member xác nhận nội dung sửa trước khi xử lý tiếp.'
  const approveTooltip =
    processedTooltip || (isWaitingMember ? waitingMemberTooltip : 'Duyệt KPI/OKR này.')
  const editTooltip =
    processedTooltip || 'Đề xuất sửa nội dung, chỉ tiêu hoặc ưu tiên. Member cần xác nhận thay đổi.'
  const deleteTooltip = processedTooltip || 'Xóa hẳn KPI/OKR này và thông báo cho Leader/Member.'

  useEffect(() => {
    if (!editOpen) return
    setDraft({
      priority: assignment.priority,
      content: assignment.content,
      targetMetric: assignment.targetMetric ?? '',
    })
  }, [assignment, editOpen])

  const handleApproveGoal = useCallback(async () => {
    setApproving(true)
    try {
      await performanceApi.approveGoalReview(requestId, assignment.id)
      toast.success('Đã duyệt KPI/OKR.')
      onChanged()
    } catch (err: unknown) {
      toast.error('Duyệt thất bại: ' + getApiErrorMessage(err))
    } finally {
      setApproving(false)
    }
  }, [assignment.id, onChanged, requestId])

  const handleSave = useCallback(async () => {
    const content = draft.content.trim()
    if (!content) {
      toast.error('Nội dung KPI/OKR không được trống.')
      return
    }
    if (content.length > 500) {
      toast.error('Nội dung KPI/OKR tối đa 500 ký tự.')
      return
    }
    if (!Number.isInteger(draft.priority) || draft.priority < 0 || draft.priority > 99) {
      toast.error('Ưu tiên không hợp lệ.')
      return
    }

    setSaving(true)
    try {
      await performanceApi.proposeGoalReviewEdit(requestId, assignment.id, {
        priority: draft.priority,
        content,
        targetMetric: draft.targetMetric.trim() || null,
      })
      toast.success('Đã gửi nội dung sửa cho member xác nhận.')
      setEditOpen(false)
      onChanged()
    } catch (err: unknown) {
      toast.error('Sửa thất bại: ' + getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [assignment.id, draft, onChanged, requestId])

  const handleDeleteGoal = useCallback(async () => {
    setDeleting(true)
    try {
      await performanceApi.deleteApprovalAssignment(requestId, assignment.id)
      toast.success('Đã xóa KPI/OKR và gửi thông báo cho Leader/Member.')
      setDeleteOpen(false)
      onChanged()
    } catch (err: unknown) {
      toast.error('Xóa thất bại: ' + getApiErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }, [assignment.id, onChanged, requestId])

  const handleRejectGoal = useCallback(async () => {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Vui lòng nhập lý do từ chối.')
      return
    }
    setRejecting(true)
    try {
      await performanceApi.rejectGoalReview(requestId, assignment.id, reason)
      toast.success('Đã từ chối KPI/OKR.')
      setRejectOpen(false)
      setRejectReason('')
      onChanged()
    } catch (err: unknown) {
      toast.error('Từ chối thất bại: ' + getApiErrorMessage(err))
    } finally {
      setRejecting(false)
    }
  }, [assignment.id, onChanged, rejectReason, requestId])

  return (
    <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-2.5 py-2 text-right shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.18)] dark:bg-slate-950">
      <div className="flex items-center justify-end gap-1">
        <ActionTooltip label={approveTooltip}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
            disabled={busy || isTerminal || isWaitingMember}
            onClick={() => void handleApproveGoal()}
            aria-label="Gửi duyệt KPI/OKR"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label={editTooltip}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
            disabled={busy || isTerminal}
            onClick={() => setEditOpen(true)}
            aria-label="Sửa mục tiêu"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label={deleteTooltip}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            disabled={busy || isTerminal}
            onClick={() => setDeleteOpen(true)}
            aria-label="Xóa KPI/OKR"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open)
        }}
        title="Xóa hẳn KPI/OKR?"
        description="KPI/OKR này sẽ bị xóa khỏi kỳ hiện tại. Leader và member sẽ nhận thông báo trong hệ thống."
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa KPI/OKR'}
        cancelLabel="Hủy"
        destructive
        onConfirm={() => {
          if (!deleting) void handleDeleteGoal()
        }}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sửa mục tiêu KPI/OKR</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ưu tiên</Label>
              <Select
                value={String(draft.priority)}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, priority: Number(v) }))}
                disabled={saving}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Không xếp (0)</SelectItem>
                  <SelectItem value="1">Ưu tiên 1</SelectItem>
                  <SelectItem value="2">Ưu tiên 2</SelectItem>
                  <SelectItem value="3">Ưu tiên 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chỉ tiêu</Label>
              <Input
                value={draft.targetMetric}
                onChange={(e) => setDraft((prev) => ({ ...prev, targetMetric: e.target.value }))}
                disabled={saving}
                className="h-10 rounded-xl"
                placeholder="VD: 60"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Nội dung KPI/OKR</Label>
              <Textarea
                value={draft.content}
                onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
                disabled={saving}
                maxLength={500}
                rows={4}
                className="rounded-xl"
                placeholder="Nhập nội dung KPI/OKR..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối KPI/OKR</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Lý do từ chối</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              maxLength={1000}
              disabled={rejecting}
              className="rounded-xl"
              placeholder="Nhập lý do để member và leader nắm được..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectGoal()}
              disabled={rejecting}
            >
              {rejecting ? 'Đang từ chối...' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </td>
  )
}

type ApprovalGoalCreateDraft = {
  kind: PerformanceKind
  priority: number
  content: string
  targetMetric: string
}

function AddApprovalGoalDialog({
  requestId,
  userId,
  year,
  month,
  disabled,
  onChanged,
}: {
  requestId: string
  userId: string
  year: number
  month: number
  disabled: boolean
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ApprovalGoalCreateDraft>({
    kind: 'KPI',
    priority: 1,
    content: '',
    targetMetric: '',
  })

  const reset = useCallback(() => {
    setDraft({ kind: 'KPI', priority: 1, content: '', targetMetric: '' })
  }, [])

  const handleCreate = useCallback(async () => {
    const content = draft.content.trim()
    if (!content) {
      toast.error('Nội dung KPI/OKR không được trống.')
      return
    }
    if (content.length > 500) {
      toast.error('Nội dung KPI/OKR tối đa 500 ký tự.')
      return
    }
    if (!Number.isInteger(draft.priority) || draft.priority < 0 || draft.priority > 99) {
      toast.error('Ưu tiên không hợp lệ.')
      return
    }

    setSaving(true)
    try {
      await performanceApi.createApprovalAssignment(requestId, {
        assigneeUserId: userId,
        year,
        month,
        kind: draft.kind,
        priority: draft.priority,
        content,
        targetMetric: draft.targetMetric.trim() || null,
      })
      toast.success('Đã thêm KPI/OKR vào yêu cầu duyệt.')
      setOpen(false)
      reset()
      onChanged()
    } catch (err: unknown) {
      toast.error('Thêm KPI/OKR thất bại: ' + getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [draft, month, onChanged, requestId, reset, userId, year])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <ActionTooltip
        label={
          disabled
            ? 'Chỉ thêm KPI/OKR khi yêu cầu đang chờ duyệt.'
            : 'Thêm KPI/OKR cho nhân sự này.'
        }
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-7 rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Thêm KPI
        </Button>
      </ActionTooltip>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm KPI/OKR cho nhân sự</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Hạng mục</Label>
            <Select
              value={draft.kind}
              onValueChange={(v) => setDraft((prev) => ({ ...prev, kind: v as PerformanceKind }))}
              disabled={saving}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KPI">KPI</SelectItem>
                <SelectItem value="OKR">OKR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ưu tiên</Label>
            <Select
              value={String(draft.priority)}
              onValueChange={(v) => setDraft((prev) => ({ ...prev, priority: Number(v) }))}
              disabled={saving}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Không xếp (0)</SelectItem>
                <SelectItem value="1">Ưu tiên 1</SelectItem>
                <SelectItem value="2">Ưu tiên 2</SelectItem>
                <SelectItem value="3">Ưu tiên 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">Chỉ tiêu</Label>
            <Input
              value={draft.targetMetric}
              onChange={(e) => setDraft((prev) => ({ ...prev, targetMetric: e.target.value }))}
              disabled={saving}
              placeholder="VD: 40"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">Nội dung KPI/OKR</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
              disabled={saving}
              maxLength={500}
              placeholder="Nhập nội dung KPI/OKR cần bổ sung..."
              className="min-h-[110px] rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={() => void handleCreate()} disabled={saving}>
            {saving ? 'Đang thêm...' : 'Thêm KPI/OKR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeamKpiInline({
  requestId,
  teamId,
  year,
  month,
  requestStatus,
  onChanged,
}: {
  requestId: string
  teamId: string
  year: number
  month: number
  requestStatus: ApprovalRequest['status']
  onChanged: () => void
}) {
  const assignmentsQ = useQuery({
    queryKey: ['kpi-assignments', teamId, year, month],
    queryFn: () => performanceApi.listAssignments(teamId, year, month),
    enabled: !isMockApiEnabled(),
  })

  if (assignmentsQ.isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const assignments = assignmentsQ.data ?? []

  if (assignments.length === 0) {
    return <p className="p-3 text-center text-xs text-slate-400">Chưa có KPI/OKR nào.</p>
  }

  // Group by assignee
  const grouped: { userId: string; name: string; items: PerformanceAssignment[] }[] = []
  for (const a of assignments) {
    const last = grouped[grouped.length - 1]
    if (last && last.userId === a.assigneeUserId) {
      last.items.push(a)
    } else {
      grouped.push({
        userId: a.assigneeUserId,
        name: a.assigneeDisplayName ?? a.assigneeUserId,
        items: [a],
      })
    }
  }

  const showActionColumn = requestStatus === 'pending' && !isMockApiEnabled()

  return (
    <div className="px-3 pb-3 space-y-4">
      {grouped.map((g) => (
        <div key={g.userId} className="rounded-lg border overflow-hidden">
          {/* Member header */}
          <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{g.name}</span>
            <span className="text-xs text-slate-400">({g.items.length} mục tiêu)</span>
          </div>
          {/* Table — same columns as /monthly-report: Ngày xét, Hạng mục, Ưu tiên, Nội dung, Chỉ tiêu */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500">
                    Ngày xét
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500">
                    Hạng mục
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500">
                    Ưu tiên
                  </th>
                  <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Nội dung</th>
                  <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500">
                    Chỉ tiêu
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-2 text-left font-semibold text-slate-500">
                    QL xét duyệt
                  </th>
                  {showActionColumn && (
                    <th className="sticky right-0 z-10 whitespace-nowrap bg-slate-50 px-2.5 py-2 text-right font-semibold text-slate-500 shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.18)] dark:bg-slate-800/50">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {!isMockApiEnabled() ? (
                  <tr className="border-b bg-white/70 dark:bg-slate-900/40">
                    <td colSpan={showActionColumn ? 7 : 6} className="px-2.5 py-2 text-right">
                      <AddApprovalGoalDialog
                        requestId={requestId}
                        userId={g.userId}
                        year={year}
                        month={month}
                        disabled={requestStatus !== 'pending'}
                        onChanged={onChanged}
                      />
                    </td>
                  </tr>
                ) : null}
                {g.items.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-2.5 py-2 tabular-nums text-slate-500">
                      {formatKpiSetAt(a.kpiSetAt)}
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold',
                          a.kind === 'KPI'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
                        )}
                      >
                        {a.kind}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2">
                      <PriorityText priority={a.priority} />
                    </td>
                    <td className="px-2.5 py-2 max-w-[400px] whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                      {a.content}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                      {a.targetMetric?.trim() || '—'}
                    </td>
                    <td className="min-w-[180px] px-2.5 py-2 align-top">
                      <GoalReviewStatusBadge review={a.goalReview} />
                      <GoalReviewSummary review={a.goalReview} />
                    </td>
                    {showActionColumn && (
                      <ApprovalGoalActionCell
                        requestId={requestId}
                        assignment={a}
                        onChanged={onChanged}
                      />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function RejectDialog({
  request,
  onClose,
  onRejected,
}: {
  request: ApprovalRequest
  onClose: () => void
  onRejected: () => void
}) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReject = useCallback(async () => {
    setLoading(true)
    try {
      await performanceApi.rejectRequest(request.id, note.trim() || null)
      toast.success('Đã từ chối KPI/OKR')
      onRejected()
      onClose()
    } catch (err: unknown) {
      toast.error('Từ chối thất bại: ' + getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [request.id, note, onRejected, onClose])

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Từ chối KPI/OKR</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Team: <strong>{request.teamName}</strong> — T{request.month}/{request.year}
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lý do từ chối (tùy chọn)
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập lý do để leader biết cần điều chỉnh gì..."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button variant="destructive" onClick={() => void handleReject()} disabled={loading}>
          {loading ? 'Đang từ chối...' : 'Từ chối'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function ManagerKpiApprovalScreen() {
  const qc = useQueryClient()
  const { year: y0, month: m0 } = nowYm()
  const [year, setYear] = useState(y0)
  const [month, setMonth] = useState(m0)
  const [approvalType, setApprovalType] = useState<ApprovalRequestType>('goal')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [rejectRequest, setRejectRequest] = useState<ApprovalRequest | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const [evaluationsByReqId, setEvaluationsByReqId] = useState<
    Record<string, { assignmentId: string; status: 'OK' | 'NOT' }[]>
  >({})
  const [allEvaluatedByReqId, setAllEvaluatedByReqId] = useState<Record<string, boolean>>({})

  const handleEvaluationsChange = useCallback(
    (
      reqId: string,
      evals: { assignmentId: string; status: 'OK' | 'NOT' }[],
      allEvaluated: boolean
    ) => {
      setEvaluationsByReqId((prev) => {
        if (JSON.stringify(prev[reqId]) === JSON.stringify(evals)) return prev
        return { ...prev, [reqId]: evals }
      })
      setAllEvaluatedByReqId((prev) => {
        if (prev[reqId] === allEvaluated) return prev
        return { ...prev, [reqId]: allEvaluated }
      })
    },
    []
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const approvalKey = ['kpi-approval-requests', statusFilter, year, month, approvalType] as const
  const requestsQ = useQuery({
    queryKey: approvalKey,
    queryFn: () =>
      performanceApi.listApprovalRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        year,
        month,
        type: approvalType,
      }),
    enabled: !isMockApiEnabled(),
    staleTime: 30_000,
  })

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['kpi-approval-requests'] })
    void qc.invalidateQueries({ queryKey: ['kpi-assignments'] })
    // Sau khi duyệt, finalEvalStatus được set → làm mới danh sách assignment inline để hiển thị
    // "Đánh giá Manager" (read-only) thay vì cache cũ còn trống.
    void qc.invalidateQueries({ queryKey: ['kpi-assignments-result'] })
  }, [qc])

  const handleApprove = useCallback(
    async (req: ApprovalRequest) => {
      setApprovingId(req.id)
      try {
        const evaluations = evaluationsByReqId[req.id] ?? []
        await performanceApi.approveRequest(req.id, evaluations)
        toast.success(
          req.type === 'result'
            ? `Đã duyệt kết quả team ${req.teamName ?? ''}`
            : `Đã duyệt mục tiêu KPI/OKR team ${req.teamName ?? ''}`
        )
        refresh()
      } catch (err: unknown) {
        toast.error('Duyệt thất bại: ' + getApiErrorMessage(err))
      } finally {
        setApprovingId(null)
      }
    },
    [refresh, evaluationsByReqId]
  )

  const yearOptions = Array.from({ length: 3 }, (_, i) => y0 - 1 + i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  const requests = requestsQ.data ?? []

  // Stats summary
  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => r.status === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    return { total, pending, approved, rejected }
  }, [requests])

  return (
    <div className="relative isolate mx-auto max-w-[1400px] px-3 py-6 md:px-4">
      <div
        className={cn(
          'mb-8 border-none bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-5 text-white shadow-2xl rounded-3xl relative overflow-hidden sm:px-6 sm:py-6 md:p-8',
          SECTION_FADE_UP
        )}
      >
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 [mask-image:linear-gradient(to_left,white,transparent)]" />
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight mb-2 sm:text-3xl">
            Duyệt KPI/OKR theo team
          </h1>
          <p className="text-indigo-100/80 max-w-2xl text-sm font-medium">
            Duyệt mục tiêu đầu tháng hoặc kết quả cuối tháng do Leader gửi lên.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={approvalType === 'goal' ? 'default' : 'outline'}
          className="rounded-xl"
          onClick={() => setApprovalType('goal')}
        >
          Mục tiêu đầu tháng
        </Button>
        <Button
          type="button"
          size="sm"
          variant={approvalType === 'result' ? 'default' : 'outline'}
          className="rounded-xl"
          onClick={() => setApprovalType('result')}
        >
          Kết quả cuối tháng
        </Button>
      </div>

      {/* Filters */}
      <Card className={cn('mb-6', CARD_ENTRANCE)} style={{ animationDelay: '50ms' }}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tháng
              </Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-10 w-36 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Năm
              </Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-10 w-28 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Trạng thái
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-40 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      {requests.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.total}</span>{' '}
            team
          </span>
          {stats.pending > 0 && (
            <span className="inline-flex items-center gap-1 text-yellow-600">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-semibold">{stats.pending}</span> chờ duyệt
            </span>
          )}
          {stats.approved > 0 && (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-semibold">{stats.approved}</span> đã duyệt
            </span>
          )}
          {stats.rejected > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <X className="h-3.5 w-3.5" />
              <span className="font-semibold">{stats.rejected}</span> từ chối
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {requestsQ.isLoading && (
        <Card className={CARD_ENTRANCE}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!requestsQ.isLoading && requests.length === 0 && (
        <Card className={CARD_ENTRANCE}>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              Không có yêu cầu {approvalType === 'result' ? 'kết quả' : 'mục tiêu'} nào trong kỳ
              này.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Team cards — expandable inline KPI */}
      {requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req: ApprovalRequest, idx: number) => {
            const isExpanded = expandedIds.has(req.id)
            return (
              <Card
                key={req.id}
                className={cn(CARD_ENTRANCE, 'overflow-hidden transition-shadow hover:shadow-md')}
                style={{ animationDelay: `${100 + idx * 30}ms` }}
              >
                {/* Card header — always visible */}
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none',
                    'hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors'
                  )}
                  onClick={() => toggleExpand(req.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleExpand(req.id)
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs',
                        'bg-gradient-to-br from-indigo-500 to-violet-600'
                      )}
                    >
                      {(req.teamName ?? req.teamId).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {req.teamName ?? req.teamId}
                      </p>
                      <p className="text-xs text-slate-400">
                        Gửi {new Date(req.submittedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ApprovalStatusBadge status={req.status} />
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Expanded: inline KPI view + actions */}
                {isExpanded && (
                  <>
                    {/* Divider */}
                    <div className="border-t" />

                    {/* KPI / kết quả */}
                    {req.type === 'result' ? (
                      <TeamResultInline
                        teamId={req.teamId}
                        year={req.year}
                        month={req.month}
                        requestStatus={req.status}
                        onEvaluationsChange={(evals, allEvaluated) =>
                          handleEvaluationsChange(req.id, evals, allEvaluated)
                        }
                      />
                    ) : (
                      <TeamKpiInline
                        requestId={req.id}
                        teamId={req.teamId}
                        year={req.year}
                        month={req.month}
                        requestStatus={req.status}
                        onChanged={refresh}
                      />
                    )}

                    {/* Actions bar */}
                    {req.status === 'pending' && req.type === 'result' && (
                      <>
                        <div className="border-t" />
                        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/30">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRejectRequest(req)
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleApprove(req)
                            }}
                            disabled={
                              approvingId === req.id ||
                              (req.type === 'result' && !allEvaluatedByReqId[req.id])
                            }
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {approvingId === req.id ? (
                              'Đang duyệt...'
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                {req.type === 'result' ? 'Duyệt kết quả' : 'Duyệt mục tiêu'}
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}

                    {req.status === 'rejected' && req.note && (
                      <>
                        <div className="border-t" />
                        <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">
                          <strong>Lý do từ chối:</strong> {req.note}
                        </div>
                      </>
                    )}
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Reject dialog (only modal left) */}
      <Dialog
        open={!!rejectRequest}
        onOpenChange={(o) => {
          if (!o) setRejectRequest(null)
        }}
      >
        {rejectRequest && (
          <RejectDialog
            request={rejectRequest}
            onClose={() => setRejectRequest(null)}
            onRejected={refresh}
          />
        )}
      </Dialog>
    </div>
  )
}
