import { useEffect, useRef, useState } from 'react'
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
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuthStore } from '@/stores/auth.store'
import { isManagerLikeRole } from '@/lib/managerLikeRole'
import {
  performanceApi,
  workReportApi,
  type PerformanceWindowConfig,
  type WorkReport,
  type WorkReportStatus,
} from '../api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Skeleton } from '@/components/ui/skeleton'
import { generateWorkReportTemplate } from '../utils/workReportTemplate'

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

function getDeadline(year: number, month: number, deadlineDay = 10) {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, deadlineDay, 23, 59, 59)
}

function isDeadlinePassed(year: number, month: number, deadlineDay = 10) {
  return new Date() > getDeadline(year, month, deadlineDay)
}

function formatDeadline(year: number, month: number, deadlineDay = 10) {
  const d = getDeadline(year, month, deadlineDay)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function resolveReportDeadlineDay(
  configs: PerformanceWindowConfig[] | undefined,
  teamId: string,
  year: number,
  month: number
) {
  const specific = configs?.find(
    (cfg) => cfg.teamId === teamId && cfg.year === year && cfg.month === month
  )
  const global = configs?.find(
    (cfg) => cfg.teamId === null && cfg.year === year && cfg.month === month
  )
  return specific?.reportDeadlineDay ?? global?.reportDeadlineDay ?? 10
}

// ─── Section collapse ─────────────────────────────────────────────────────────

function Section({
  title,
  required,
  children,
  defaultOpen = true,
}: {
  title: string
  required?: boolean
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
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
          {required && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              Bắt buộc
            </span>
          )}
        </span>
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

// ─── Rich field wrapper ───────────────────────────────────────────────────────

function RichField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  minHeight = 140,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={readOnly ? undefined : placeholder}
        readOnly={readOnly}
        minHeight={minHeight}
        imageUploadUrl="/performance/work-reports/evidence-image"
      />
    </div>
  )
}

// ─── Form state type ──────────────────────────────────────────────────────────

type FormState = {
  // Legacy plain-text fields
  part1KpiNarrative: string
  part1Situation: string
  part1Cause: string
  part1Solution: string
  part2SelfRating: string
  part2SelfComment: string
  part3NextMonthPlan: string
  // Rich-text sections (HTML from Tiptap)
  partWorkDone: string
  partOutputResult: string
  partOkr: string
  partIssues: string
  partEvidence: string
  // File upload
  fileUrl: string | null
  fileOriginalName: string | null
  fileMimeType: string | null
}

function makeForm(report: WorkReport | null | undefined): FormState {
  return {
    part1KpiNarrative: report?.part1KpiNarrative ?? '',
    part1Situation: report?.part1Situation ?? '',
    part1Cause: report?.part1Cause ?? '',
    part1Solution: report?.part1Solution ?? '',
    part2SelfRating: report?.part2SelfRating ?? '',
    part2SelfComment: report?.part2SelfComment ?? '',
    part3NextMonthPlan: report?.part3NextMonthPlan ?? '',
    partWorkDone: report?.partWorkDone ?? '',
    partOutputResult: report?.partOutputResult ?? '',
    partOkr: report?.partOkr ?? '',
    partIssues: report?.partIssues ?? '',
    partEvidence: report?.partEvidence ?? '',
    fileUrl: report?.fileUrl ?? null,
    fileOriginalName: report?.fileOriginalName ?? null,
    fileMimeType: report?.fileMimeType ?? null,
  }
}

// ─── Required sections banner ─────────────────────────────────────────────────

const REQUIRED_SECTIONS = [
  'Công việc đã làm',
  'Kết quả đầu ra',
  'Nguyên nhân',
  'KPI',
  'Minh chứng',
  'Đề xuất',
  'OKR',
  'Vấn đề',
  'Kế hoạch tháng sau',
]

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
  const windowConfigsQ = useQuery({
    queryKey: ['performance', 'window-configs'],
    queryFn: () => performanceApi.listWindowConfigs(),
    staleTime: 60_000,
  })
  const report = reportQ.data

  const [form, setForm] = useState<FormState>(() => makeForm(report))
  const set =
    <K extends keyof FormState>(key: K) =>
    (v: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: v }))

  const isReadOnly = !!report && !['draft', 'late_approved'].includes(report.status)
  const reportDeadlineDay = resolveReportDeadlineDay(windowConfigsQ.data, teamId, year, month)
  const deadlinePassed = isDeadlinePassed(year, month, reportDeadlineDay)
  const canSubmit = !isReadOnly && (!deadlinePassed || report?.status === 'late_approved')

  const saveMut = useMutation({
    mutationFn: () => workReportApi.upsertMyWorkReport({ teamId, year, month, ...form }),
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

  const reportSyncKey = report ? `${report.id}:${report.updatedAt}` : `empty:${year}:${month}`
  useEffect(() => {
    if (!saveMut.isPending) {
      setForm(makeForm(report))
    }
  }, [reportSyncKey, saveMut.isPending])

  if (reportQ.isLoading) {
    return (
      <div className="space-y-3 py-4" role="status" aria-busy aria-label="Đang tải báo cáo">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (reportQ.isError) {
    return (
      <ErrorState
        title="Không tải được báo cáo"
        description="Vui lòng thử lại sau."
        onRetry={() => void reportQ.refetch()}
        retrying={reportQ.isFetching}
        compact
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Required sections notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Các mục bắt buộc trong báo cáo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_SECTIONS.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              {s}
            </span>
          ))}
        </div>
      </div>

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
            ? `Đã quá hạn nộp báo cáo T${month}/${year} (${formatDeadline(year, month, reportDeadlineDay)})`
            : `Hạn nộp báo cáo T${month}/${year}: ${formatDeadline(year, month, reportDeadlineDay)}`}
        </span>
        {report && <StatusBadge status={report.status as WorkReportStatus} />}
      </div>

      {/* Input mode toggle */}
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
      {inputMode === 'upload' && !isReadOnly && (
        <div className="space-y-3">
          {/* Template download hint */}
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/30">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Tải file mẫu Word (.docx)
              </p>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                Đã có sẵn 9 mục bắt buộc — chỉ cần điền câu trả lời rồi upload lại
              </p>
            </div>
            <button
              type="button"
              onClick={() => generateWorkReportTemplate(year, month)}
              className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-300"
            >
              <Download className="h-4 w-4" />
              Tải file mẫu
            </button>
          </div>

          {/* Upload zone */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700">
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
              <div className="flex items-center justify-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                <span className="truncate">{form.fileOriginalName ?? 'File đã upload'}</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 text-xs text-blue-600 underline"
                >
                  Thay thế
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm font-medium text-blue-600 hover:underline"
                  disabled={uploadMut.isPending}
                >
                  {uploadMut.isPending ? 'Đang upload...' : 'Chọn file PDF hoặc DOCX'}
                </button>
                <p className="mt-1 text-xs text-slate-400">Kích thước tối đa 20MB</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Write mode — rich text sections */}
      {(inputMode === 'write' || isReadOnly) && (
        <div className="space-y-3">
          {/* ── Section 1: Công việc đã làm ── */}
          <Section title="Công việc đã làm" required>
            <RichField
              label="Mô tả các công việc đã thực hiện trong tháng"
              value={form.partWorkDone}
              onChange={set('partWorkDone')}
              placeholder="Liệt kê các công việc đã làm trong tháng này..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 2: Kết quả đầu ra ── */}
          <Section title="Kết quả đầu ra" required>
            <RichField
              label="Kết quả cụ thể đạt được"
              value={form.partOutputResult}
              onChange={set('partOutputResult')}
              placeholder="Mô tả kết quả đầu ra (sản phẩm, chỉ số, deliverables)..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 3: KPI ── */}
          <Section title="KPI" required>
            <RichField
              label="Tổng hợp kết quả KPI tháng"
              value={form.part1KpiNarrative}
              onChange={set('part1KpiNarrative')}
              placeholder="Tóm tắt kết quả KPI so với chỉ tiêu đặt ra, các chỉ số đạt/không đạt..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 4: OKR ── */}
          <Section title="OKR" required>
            <RichField
              label="Kết quả OKR tháng"
              value={form.partOkr}
              onChange={set('partOkr')}
              placeholder="Mô tả tiến độ các Objectives & Key Results..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 5: Nguyên nhân ── */}
          <Section title="Nguyên nhân" required>
            <RichField
              label="Phân tích nguyên nhân (khi chưa đạt mục tiêu)"
              value={form.part1Cause}
              onChange={set('part1Cause')}
              placeholder="Phân tích nguyên nhân chủ quan và khách quan..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 6: Vấn đề ── */}
          <Section title="Vấn đề" required>
            <RichField
              label="Các vấn đề gặp phải"
              value={form.partIssues}
              onChange={set('partIssues')}
              placeholder="Nêu các vướng mắc, khó khăn trong tháng và mức độ ảnh hưởng..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 7: Minh chứng ── */}
          <Section title="Minh chứng" required>
            <RichField
              label="Bằng chứng, tài liệu đính kèm"
              value={form.partEvidence}
              onChange={set('partEvidence')}
              placeholder="Chèn ảnh chụp màn hình, số liệu, link tài liệu minh chứng... (dùng nút ảnh trong toolbar)"
              readOnly={isReadOnly}
              minHeight={180}
            />
          </Section>

          {/* ── Section 8: Đề xuất ── */}
          <Section title="Đề xuất" required>
            <RichField
              label="Đề xuất giải pháp / cải tiến"
              value={form.part1Solution}
              onChange={set('part1Solution')}
              placeholder="Đề xuất các biện pháp khắc phục, cải thiện, hoặc ý kiến với cấp trên..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 9: Kế hoạch tháng sau ── */}
          <Section title="Kế hoạch tháng sau" required>
            <RichField
              label={`Mục tiêu và kế hoạch triển khai tháng ${month === 12 ? 1 : month + 1}/${month === 12 ? year + 1 : year}`}
              value={form.part3NextMonthPlan}
              onChange={set('part3NextMonthPlan')}
              placeholder="Liệt kê các mục tiêu và kế hoạch hành động tháng tới..."
              readOnly={isReadOnly}
            />
          </Section>

          {/* ── Section 10: Tự đánh giá ── */}
          <Section title="Tự đánh giá" defaultOpen={false}>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tự xếp loại
                </label>
                <select
                  value={form.part2SelfRating}
                  onChange={(e) => set('part2SelfRating')(e.target.value)}
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
              <RichField
                label="Nhận xét bản thân"
                value={form.part2SelfComment}
                onChange={set('part2SelfComment')}
                placeholder="Nhận xét về kết quả công việc và thái độ làm việc của bạn..."
                readOnly={isReadOnly}
                minHeight={100}
              />
            </div>
          </Section>

          {/* Leader evaluation — visible after reviewed */}
          {report?.status === 'reviewed' && (
            <Section title="Đánh giá của Leader" defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Xếp loại:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {report.part2LeaderRating ?? '—'}
                  </span>
                </div>
                <RichField
                  label="Nhận xét của Leader"
                  value={report.part2LeaderComment ?? ''}
                  readOnly
                  minHeight={80}
                />
              </div>
            </Section>
          )}

          {/* Q&A from questionnaire (read-only) */}
          {report?.questionnairePart4 && report.questionnairePart4.length > 0 && (
            <Section title="Trả lời câu hỏi của Leader" defaultOpen={false}>
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
    return (
      <div className="space-y-3 py-4" role="status" aria-busy aria-label="Đang tải báo cáo">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  const reports = reportsQ.data ?? []

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Chưa có thành viên nào nộp báo cáo"
          description="Trong kỳ này chưa có báo cáo công việc được nộp."
          compact
          className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800"
        />
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
                    <div>
                      <p>{r.user?.displayName ?? r.user?.email ?? r.userId.slice(0, 8)}</p>
                      {r.user?.employeeCode && (
                        <p className="text-xs font-normal text-slate-400">{r.user.employeeCode}</p>
                      )}
                    </div>
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

      {/* Review modal */}
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
                  {[
                    { label: 'Công việc đã làm', html: selected.partWorkDone },
                    { label: 'Kết quả đầu ra', html: selected.partOutputResult },
                    { label: 'KPI', html: selected.part1KpiNarrative },
                    { label: 'OKR', html: selected.partOkr },
                    { label: 'Nguyên nhân', html: selected.part1Cause },
                    { label: 'Vấn đề', html: selected.partIssues },
                    { label: 'Minh chứng', html: selected.partEvidence },
                    { label: 'Đề xuất', html: selected.part1Solution },
                    { label: 'Kế hoạch tháng sau', html: selected.part3NextMonthPlan },
                  ].map(({ label, html }) =>
                    html ? (
                      <div key={label}>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {label}
                        </p>
                        <div
                          className="prose prose-sm max-w-none rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Leader evaluation */}
              {['submitted', 'late_submitted', 'reviewed'].includes(selected.status) && (
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Đánh giá của bạn
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
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Nhận xét</label>
                    <textarea
                      rows={3}
                      value={leaderComment}
                      onChange={
                        selected.status !== 'reviewed'
                          ? (e) => setLeaderComment(e.target.value)
                          : undefined
                      }
                      readOnly={selected.status === 'reviewed'}
                      className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
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
  const isLeader = user?.role === 'LEADER' || isManagerLikeRole(user?.role)
  const [activeView, setActiveView] = useState<'mine' | 'team'>(
    canSeeTeamWide && isLeader ? 'team' : 'mine'
  )

  if (!selectedTeamId) {
    return (
      <EmptyState
        title="Chưa chọn team"
        description="Vui lòng chọn team để xem báo cáo."
        compact
        className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800"
      />
    )
  }

  return (
    <div className="space-y-4">
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
