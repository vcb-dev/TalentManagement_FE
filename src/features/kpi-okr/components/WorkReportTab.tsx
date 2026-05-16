import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Pencil,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { workReportApi, type WorkReport, type WorkReportStatus } from '../api'

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WorkReportStatus, string> = {
  draft: 'Nháp',
  submitted: 'Đã nộp',
  late_pending: 'Chờ duyệt nộp muộn',
  late_approved: 'Được nộp muộn',
  late_submitted: 'Nộp muộn',
  reviewed: 'Đã xác nhận',
}

const STATUS_COLOR: Record<WorkReportStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  late_pending: 'bg-amber-50 text-amber-700 border-amber-200',
  late_approved: 'bg-lime-50 text-lime-700 border-lime-200',
  late_submitted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  reviewed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function StatusBadge({ status }: { status: WorkReportStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium',
        STATUS_COLOR[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Deadline helpers ─────────────────────────────────────────────────────────

function getDeadline(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, 10, 23, 59, 59)
}

function isDeadlinePassed(year: number, month: number) {
  return new Date() > getDeadline(year, month)
}

function formatDeadline(year: number, month: number) {
  const d = getDeadline(year, month)
  return `10/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate(year: number, month: number) {
  const content = [
    `BÁO CÁO TỔNG KẾT CÔNG VIỆC THÁNG ${month}/${year}`,
    '='.repeat(50),
    '',
    'Họ và tên    : ___________________________________',
    'Phòng/Nhóm   : ___________________________________',
    'Kỳ báo cáo   : Tháng ' + month + '/' + year,
    '',
    '─'.repeat(50),
    'PHẦN 1 — KẾT QUẢ KPI/OKR & ĐÁNH GIÁ CHI TIẾT',
    '─'.repeat(50),
    '',
    '1.1 Tổng hợp KPI/OKR tháng',
    '(Điền kết quả đạt được so với chỉ tiêu đặt ra)',
    '',
    '',
    '',
    '1.2 Thực trạng',
    '(Mô tả tình trạng thực tế, so sánh với kế hoạch)',
    '',
    '',
    '',
    '1.3 Nguyên nhân (khi chưa đạt mục tiêu)',
    '(Phân tích nguyên nhân chủ quan và khách quan)',
    '',
    '',
    '',
    '1.4 Giải pháp',
    '(Đề xuất biện pháp khắc phục, cải thiện)',
    '',
    '',
    '',
    '─'.repeat(50),
    'PHẦN 2 — TỰ ĐÁNH GIÁ',
    '─'.repeat(50),
    '',
    '2.1 Tự xếp loại  :  [ ] A    [ ] B    [ ] C    [ ] D',
    '',
    '2.2 Nhận xét bản thân',
    '(Tự nhận xét về hiệu suất và thái độ làm việc)',
    '',
    '',
    '',
    '─'.repeat(50),
    'PHẦN 3 — KẾ HOẠCH THÁNG TỚI',
    '─'.repeat(50),
    '',
    '(Mô tả mục tiêu và kế hoạch triển khai tháng ' +
      (month === 12 ? 1 : month + 1) +
      '/' +
      (month === 12 ? year + 1 : year) +
      ')',
    '',
    '',
    '',
    '─'.repeat(50),
    'PHẦN 4 — TRẢ LỜI CÂU HỎI (do trưởng nhóm đặt)',
    '─'.repeat(50),
    '',
    '(Phần này sẽ được hệ thống tự điền từ form khảo sát hàng tháng)',
    '',
    '═'.repeat(50),
    `Ngày nộp: ___/___/${year}          Chữ ký: ________________`,
  ].join('\n')

  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mau-bao-cao-T${month}-${year}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Section collapse component ───────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Textarea field ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  rows = 4,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  rows?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? undefined : placeholder}
        className={cn(
          'w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          readOnly
            ? 'cursor-default bg-slate-50 dark:bg-slate-900/60'
            : 'focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-500'
        )}
      />
    </div>
  )
}

// ─── Member view ──────────────────────────────────────────────────────────────

function MemberReportForm({
  teamId,
  year,
  month,
}: {
  teamId: string
  year: number
  month: number
}) {
  const qc = useQueryClient()
  const [inputMode, setInputMode] = useState<'write' | 'upload'>('write')
  const [lateReason, setLateReason] = useState('')
  const [showLateForm, setShowLateForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reportQ = useQuery({
    queryKey: ['work-report-me', year, month],
    queryFn: () => workReportApi.getMyWorkReport(year, month),
  })
  const report = reportQ.data

  const [form, setForm] = useState<{
    part1KpiNarrative: string
    part1Situation: string
    part1Cause: string
    part1Solution: string
    part2SelfRating: string
    part2SelfComment: string
    part3NextMonthPlan: string
    fileUrl: string | null
    fileOriginalName: string | null
    fileMimeType: string | null
  }>({
    part1KpiNarrative: report?.part1KpiNarrative ?? '',
    part1Situation: report?.part1Situation ?? '',
    part1Cause: report?.part1Cause ?? '',
    part1Solution: report?.part1Solution ?? '',
    part2SelfRating: report?.part2SelfRating ?? '',
    part2SelfComment: report?.part2SelfComment ?? '',
    part3NextMonthPlan: report?.part3NextMonthPlan ?? '',
    fileUrl: report?.fileUrl ?? null,
    fileOriginalName: report?.fileOriginalName ?? null,
    fileMimeType: report?.fileMimeType ?? null,
  })

  const isReadOnly = !!report && !['draft', 'late_approved'].includes(report.status)
  const deadlinePassed = isDeadlinePassed(year, month)
  const canSubmit = !isReadOnly && (!deadlinePassed || report?.status === 'late_approved')

  const saveMut = useMutation({
    mutationFn: () =>
      workReportApi.upsertMyWorkReport({
        teamId,
        year,
        month,
        ...form,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-report-me', year, month] }),
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      await saveMut.mutateAsync()
      const saved = await workReportApi.getMyWorkReport(year, month)
      return workReportApi.submitWorkReport(saved!.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-report-me', year, month] }),
  })

  const uploadMut = useMutation({
    mutationFn: (file: File) => workReportApi.uploadWorkReportFile(file),
    onSuccess: (data) => {
      setForm((f) => ({
        ...f,
        fileUrl: data.url,
        fileOriginalName: data.originalName,
        fileMimeType: data.mimeType,
      }))
    },
  })

  const lateMut = useMutation({
    mutationFn: () => {
      if (!report) throw new Error('Chưa có báo cáo')
      return workReportApi.requestLateWorkReport(report.id, lateReason)
    },
    onSuccess: () => {
      setShowLateForm(false)
      qc.invalidateQueries({ queryKey: ['work-report-me', year, month] })
    },
  })

  // Sync form state when report loads
  if (report && !saveMut.isPending) {
    const synced = {
      part1KpiNarrative: report.part1KpiNarrative ?? '',
      part1Situation: report.part1Situation ?? '',
      part1Cause: report.part1Cause ?? '',
      part1Solution: report.part1Solution ?? '',
      part2SelfRating: report.part2SelfRating ?? '',
      part2SelfComment: report.part2SelfComment ?? '',
      part3NextMonthPlan: report.part3NextMonthPlan ?? '',
      fileUrl: report.fileUrl ?? null,
      fileOriginalName: report.fileOriginalName ?? null,
      fileMimeType: report.fileMimeType ?? null,
    }
    // Only sync when there's no local change pending
    if (!saveMut.isSuccess) {
      Object.assign(form, synced)
    }
  }

  if (reportQ.isLoading) {
    return <div className="py-8 text-center text-sm text-slate-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      {/* Deadline banner */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm',
          deadlinePassed
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950'
            : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950'
        )}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {deadlinePassed
            ? `Đã quá hạn nộp báo cáo T${month}/${year} (${formatDeadline(year, month)})`
            : `Hạn nộp báo cáo T${month}/${year}: ${formatDeadline(year, month)}`}
        </span>
        {report && <StatusBadge status={report.status as WorkReportStatus} />}
      </div>

      {/* Input mode toggle — only when not read-only */}
      {!isReadOnly && (
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setInputMode('write')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              inputMode === 'write'
                ? 'bg-white shadow text-slate-900 dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            Soạn trực tiếp
          </button>
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              inputMode === 'upload'
                ? 'bg-white shadow text-slate-900 dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload file
          </button>
        </div>
      )}

      {/* Upload mode */}
      {(inputMode === 'upload' || form.fileUrl) && !isReadOnly && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700">
          {/* Download template hint */}
          <div className="mb-4 flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Chưa có file mẫu? Tải về để biết cách điền đúng format.
            </p>
            <button
              type="button"
              onClick={() => downloadTemplate(year, month)}
              className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
            >
              <Download className="h-3.5 w-3.5" />
              Tải file mẫu
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadMut.mutate(file)
            }}
          />
          {form.fileUrl ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>{form.fileOriginalName ?? 'File đã upload'}</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="ml-2 text-xs text-blue-600 underline"
              >
                Thay thế
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-blue-600 hover:underline"
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? 'Đang upload...' : 'Chọn file PDF hoặc DOCX (tối đa 20MB)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Write mode sections */}
      {(inputMode === 'write' || isReadOnly) && (
        <div className="space-y-3">
          {!isReadOnly && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => downloadTemplate(year, month)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Download className="h-3.5 w-3.5" />
                Tải file mẫu tham khảo
              </button>
            </div>
          )}
          <Section title="Phần 1 — Kết quả KPI/OKR & Đánh giá chi tiết">
            <div className="space-y-3">
              <Field
                label="Tổng hợp KPI/OKR tháng"
                value={form.part1KpiNarrative}
                onChange={(v) => setForm((f) => ({ ...f, part1KpiNarrative: v }))}
                placeholder="Tóm tắt kết quả KPI/OKR tháng này..."
                readOnly={isReadOnly}
                rows={4}
              />
              <Field
                label="Thực trạng"
                value={form.part1Situation}
                onChange={(v) => setForm((f) => ({ ...f, part1Situation: v }))}
                placeholder="Mô tả thực trạng công việc..."
                readOnly={isReadOnly}
                rows={3}
              />
              <Field
                label="Nguyên nhân"
                value={form.part1Cause}
                onChange={(v) => setForm((f) => ({ ...f, part1Cause: v }))}
                placeholder="Phân tích nguyên nhân..."
                readOnly={isReadOnly}
                rows={3}
              />
              <Field
                label="Giải pháp"
                value={form.part1Solution}
                onChange={(v) => setForm((f) => ({ ...f, part1Solution: v }))}
                placeholder="Đề xuất giải pháp..."
                readOnly={isReadOnly}
                rows={3}
              />
            </div>
          </Section>

          <Section title="Phần 2 — Đánh giá bản thân">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tự xếp loại
                </label>
                <select
                  value={form.part2SelfRating}
                  onChange={(e) => setForm((f) => ({ ...f, part2SelfRating: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">-- Chọn xếp loại --</option>
                  <option value="A">A — Xuất sắc</option>
                  <option value="B">B — Tốt</option>
                  <option value="C">C — Đạt yêu cầu</option>
                  <option value="D">D — Chưa đạt</option>
                </select>
              </div>
              <Field
                label="Nhận xét bản thân"
                value={form.part2SelfComment}
                onChange={(v) => setForm((f) => ({ ...f, part2SelfComment: v }))}
                placeholder="Nhận xét về kết quả công việc của bạn..."
                readOnly={isReadOnly}
                rows={3}
              />
            </div>
          </Section>

          {/* Phần 2 — Leader evaluation (read-only for member, only visible after reviewed) */}
          {report?.status === 'reviewed' && (
            <Section title="Phần 2 — Đánh giá của Leader" defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Xếp loại:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {report.part2LeaderRating ?? '—'}
                  </span>
                </div>
                <Field
                  label="Nhận xét của Leader"
                  value={report.part2LeaderComment ?? ''}
                  readOnly
                  rows={3}
                />
              </div>
            </Section>
          )}

          <Section title="Phần 3 — Kế hoạch tháng tới">
            <Field
              label="Kế hoạch công việc tháng tiếp theo"
              value={form.part3NextMonthPlan}
              onChange={(v) => setForm((f) => ({ ...f, part3NextMonthPlan: v }))}
              placeholder="Liệt kê các mục tiêu và kế hoạch tháng tới..."
              readOnly={isReadOnly}
              rows={4}
            />
          </Section>

          {/* Phần 4 — Q&A from questionnaire (read-only) */}
          {report?.questionnairePart4 && report.questionnairePart4.length > 0 && (
            <Section title="Phần 4 — Trả lời câu hỏi của Leader" defaultOpen={false}>
              <div className="space-y-3">
                {report.questionnairePart4.map((q) => (
                  <div key={q.questionId} className="space-y-1">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {q.sortOrder + 1}. {q.prompt}
                    </p>
                    <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {q.answerText || <span className="italic text-slate-400">Chưa trả lời</span>}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Đang lưu...' : 'Lưu nháp'}
          </button>

          {canSubmit && (
            <button
              type="button"
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitMut.isPending
                ? 'Đang nộp...'
                : report?.status === 'late_approved'
                  ? 'Nộp muộn'
                  : 'Nộp báo cáo'}
            </button>
          )}

          {deadlinePassed && report?.status === 'draft' && !showLateForm && (
            <button
              type="button"
              onClick={() => setShowLateForm(true)}
              className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              <AlertCircle className="h-4 w-4" />
              Yêu cầu nộp muộn
            </button>
          )}

          {report?.status === 'late_pending' && (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              Đang chờ HR duyệt yêu cầu nộp muộn...
            </span>
          )}
        </div>
      )}

      {/* Late request form */}
      {showLateForm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            Lý do nộp muộn
          </p>
          <textarea
            rows={3}
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
            placeholder="Giải thích lý do bạn không thể nộp đúng hạn..."
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:bg-slate-900"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => lateMut.mutate()}
              disabled={!lateReason.trim() || lateMut.isPending}
              className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {lateMut.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button
              type="button"
              onClick={() => setShowLateForm(false)}
              className="rounded-md px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {submitMut.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Nộp báo cáo thành công!
        </div>
      )}
    </div>
  )
}

// ─── Leader view ──────────────────────────────────────────────────────────────

function LeaderTeamReports({
  teamId,
  year,
  month,
}: {
  teamId: string
  year: number
  month: number
}) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<WorkReport | null>(null)
  const [leaderRating, setLeaderRating] = useState('')
  const [leaderComment, setLeaderComment] = useState('')

  const reportsQ = useQuery({
    queryKey: ['team-work-reports', teamId, year, month],
    queryFn: () => workReportApi.listTeamWorkReports(teamId, year, month),
  })

  const reviewMut = useMutation({
    mutationFn: (reportId: string) =>
      workReportApi.reviewWorkReport(reportId, {
        part2LeaderRating: leaderRating || null,
        part2LeaderComment: leaderComment || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-work-reports', teamId, year, month] })
      setSelected(null)
    },
  })

  if (reportsQ.isLoading) {
    return <div className="py-8 text-center text-sm text-slate-400">Đang tải...</div>
  }

  const reports = reportsQ.data ?? []

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          Chưa có thành viên nào nộp báo cáo trong kỳ này
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nhân sự</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Thời gian nộp</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Xếp loại</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {r.userId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status as WorkReportStatus} />
                    {r.isLate && <span className="ml-1 text-xs text-amber-600">(muộn)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.part2LeaderRating ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r)
                        setLeaderRating(r.part2LeaderRating ?? '')
                        setLeaderComment(r.part2LeaderComment ?? '')
                      }}
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Xem / Đánh giá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review modal/panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Báo cáo T{selected.month}/{selected.year}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Read-only content */}
              {selected.fileUrl ? (
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {selected.fileOriginalName ?? 'Tải file báo cáo'}
                </a>
              ) : (
                <div className="space-y-3">
                  {selected.part1KpiNarrative && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Phần 1 — KPI/OKR
                      </p>
                      <p className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                        {selected.part1KpiNarrative}
                      </p>
                    </div>
                  )}
                  {selected.part3NextMonthPlan && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Phần 3 — Kế hoạch tháng tới
                      </p>
                      <p className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                        {selected.part3NextMonthPlan}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Leader evaluation */}
              {['submitted', 'late_submitted', 'reviewed'].includes(selected.status) && (
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Phần 2 — Đánh giá của bạn
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Xếp loại</label>
                    <select
                      value={leaderRating}
                      onChange={(e) => setLeaderRating(e.target.value)}
                      disabled={selected.status === 'reviewed'}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">-- Chọn xếp loại --</option>
                      <option value="A">A — Xuất sắc</option>
                      <option value="B">B — Tốt</option>
                      <option value="C">C — Đạt yêu cầu</option>
                      <option value="D">D — Chưa đạt</option>
                    </select>
                  </div>
                  <Field
                    label="Nhận xét"
                    value={leaderComment}
                    onChange={selected.status !== 'reviewed' ? setLeaderComment : undefined}
                    readOnly={selected.status === 'reviewed'}
                    rows={3}
                  />
                  {selected.status !== 'reviewed' && (
                    <button
                      type="button"
                      onClick={() => reviewMut.mutate(selected.id)}
                      disabled={reviewMut.isPending}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reviewMut.isPending ? 'Đang xác nhận...' : 'Xác nhận báo cáo'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkReportTab({
  selectedTeamId,
  year,
  month,
  canSeeTeamWide,
}: {
  selectedTeamId: string
  year: number
  month: number
  canSeeTeamWide: boolean
}) {
  const user = useAuthStore((s) => s.user)
  const isLeader = user?.role === 'LEADER' || user?.role === 'MANAGER'
  const [activeView, setActiveView] = useState<'mine' | 'team'>(
    canSeeTeamWide && isLeader ? 'team' : 'mine'
  )

  if (!selectedTeamId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        Vui lòng chọn team để xem báo cáo
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab for leader/manager */}
      {canSeeTeamWide && (
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveView('mine')}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeView === 'mine'
                ? 'bg-white shadow text-slate-900 dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Báo cáo của tôi
          </button>
          <button
            type="button"
            onClick={() => setActiveView('team')}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeView === 'team'
                ? 'bg-white shadow text-slate-900 dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Báo cáo team
          </button>
        </div>
      )}

      {activeView === 'mine' && (
        <MemberReportForm teamId={selectedTeamId} year={year} month={month} />
      )}

      {activeView === 'team' && canSeeTeamWide && (
        <LeaderTeamReports teamId={selectedTeamId} year={year} month={month} />
      )}
    </div>
  )
}
