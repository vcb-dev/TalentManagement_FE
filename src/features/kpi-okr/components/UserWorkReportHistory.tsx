import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// ─── Single report card ───────────────────────────────────────────────────────

function ReportCard({ report }: { report: WorkReport }) {
  const [expanded, setExpanded] = useState(false)
  const [showAi, setShowAi] = useState(false)

  const periodLabel = `Báo cáo T${report.month}/${report.year}`
  const submittedLabel = report.submittedAt
    ? new Date(report.submittedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Card header */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{periodLabel}</span>
          <span
            className={cn(
              'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
              STATUS_COLOR[report.status as WorkReportStatus]
            )}
          >
            {STATUS_LABEL[report.status as WorkReportStatus]}
          </span>
          {report.isLate && (
            <span className="text-xs text-amber-600 dark:text-amber-400">(nộp muộn)</span>
          )}
          {report.part2LeaderRating && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Xếp loại: {report.part2LeaderRating}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {submittedLabel && <span className="text-xs text-slate-400">Nộp: {submittedLabel}</span>}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 space-y-4 px-4 py-4 dark:border-slate-800">
          {/* File attachment */}
          {report.fileUrl && (
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="h-4 w-4" />
              {report.fileOriginalName ?? 'Tải file báo cáo'}
            </a>
          )}

          {/* Text content sections */}
          {!report.fileUrl && (
            <div className="space-y-4">
              {report.part1KpiNarrative && (
                <TextBlock title="Phần 1 — KPI/OKR tháng" content={report.part1KpiNarrative} />
              )}
              {report.part1Situation && (
                <TextBlock title="Thực trạng" content={report.part1Situation} />
              )}
              {report.part1Cause && <TextBlock title="Nguyên nhân" content={report.part1Cause} />}
              {report.part1Solution && (
                <TextBlock title="Giải pháp" content={report.part1Solution} />
              )}
              {report.part2SelfRating && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Tự xếp loại:</span>
                  <span className="font-semibold">{report.part2SelfRating}</span>
                </div>
              )}
              {report.part2SelfComment && (
                <TextBlock title="Tự nhận xét" content={report.part2SelfComment} />
              )}
              {report.part3NextMonthPlan && (
                <TextBlock
                  title="Phần 3 — Kế hoạch tháng tới"
                  content={report.part3NextMonthPlan}
                />
              )}
            </div>
          )}

          {/* Leader evaluation */}
          {report.status === 'reviewed' && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-2 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Đánh giá của Leader
              </p>
              {report.part2LeaderRating && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Xếp loại:</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    {report.part2LeaderRating}
                  </span>
                </div>
              )}
              {report.part2LeaderComment && (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {report.part2LeaderComment}
                </p>
              )}
            </div>
          )}

          {/* Q&A Part 4 */}
          {report.questionnairePart4 && report.questionnairePart4.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Phần 4 — Trả lời câu hỏi
              </p>
              {report.questionnairePart4.map((q) => (
                <div key={q.questionId} className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {q.sortOrder + 1}. {q.prompt}
                  </p>
                  <p className="rounded bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {q.answerText || <span className="italic text-slate-400">Chưa trả lời</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* AI Summary */}
          {report.aiSummary && (
            <div>
              <button
                type="button"
                onClick={() => setShowAi((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                <Sparkles className="h-4 w-4" />
                {showAi ? 'Ẩn AI tóm tắt' : 'Xem AI tóm tắt'}
              </button>
              {showAi && (
                <div className="mt-2 rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-slate-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-slate-300 whitespace-pre-wrap">
                  {report.aiSummary}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TextBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {content}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserWorkReportHistory({ userId }: { userId: string }) {
  const historyQ = useQuery({
    queryKey: ['user-work-report-history', userId],
    queryFn: () => workReportApi.listUserWorkReportHistory(userId),
  })

  if (historyQ.isLoading) {
    return <div className="py-8 text-center text-sm text-slate-400">Đang tải lịch sử...</div>
  }

  const reports = historyQ.data ?? []

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-400">Nhân sự chưa có báo cáo tổng kết nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{reports.length} báo cáo</p>
      </div>
      <div className="space-y-2">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  )
}
