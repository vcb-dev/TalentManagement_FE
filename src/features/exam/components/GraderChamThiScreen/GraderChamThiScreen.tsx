import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, FileText, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useGradeExam } from '@/features/exam/hooks'
import { findGraderExamRow } from '@/features/exam/mock/mockGraderExamRows'
import { MOCK_GRADE_CRITERIA_TEMPLATE } from '@/features/exam/mock/mockGradeCriteria'

type CriterionResult = 'pass' | 'fail' | null

interface CriterionState {
  id: string
  title: string
  evidenceFile: string
  evidenceSize: string
  /** Mục 1 mặc định đã đạt theo mock HTML */
  lockedPass: boolean
  result: CriterionResult
  comment: string
}

function evidenceIconForFilename(filename: string) {
  const lower = filename.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(lower)) return ImageIcon
  return FileText
}

function buildInitialCriteria(): CriterionState[] {
  return MOCK_GRADE_CRITERIA_TEMPLATE.map((c, i) => ({
    id: `crit-${i}`,
    title: c.title,
    evidenceFile: c.evidenceFile,
    evidenceSize: c.evidenceSize,
    lockedPass: i === 0,
    result: i === 0 ? 'pass' : null,
    comment:
      i === 0
        ? 'Đọc kỹ, hiểu đúng các bước. Trình bày rõ ràng.'
        : '',
  }))
}

export interface GraderChamThiScreenProps {
  examId: string
  employeeId: string
}

export function GraderChamThiScreen({ examId, employeeId }: GraderChamThiScreenProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const gradeMutation = useGradeExam()

  const row = useMemo(() => findGraderExamRow(examId, employeeId), [examId, employeeId])

  const [criteria, setCriteria] = useState<CriterionState[]>(buildInitialCriteria)

  const examineeName = row?.examineeName ?? 'Thí sinh'
  const examineeLine = row?.examineeMeta ?? '—'
  const levelBadge = row?.levelBadge ?? '—'
  const className = row?.className ?? '—'
  const submittedAt = row?.submittedAt ?? '—'
  const initials = row?.initials ?? 'TS'
  const avatarClass = row?.avatarClass ?? 'bg-primary/10 text-primary'

  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'

  const passedCount = criteria.filter((c) => c.result === 'pass').length
  const pendingCount = criteria.filter((c) => c.result === null).length
  const gradedCount = criteria.filter((c) => c.result !== null).length
  const total = criteria.length
  const allGraded = criteria.every((c) => c.result !== null)

  const setComment = (id: string, comment: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, comment } : c)))
  }

  const setResult = (id: string, result: 'pass' | 'fail') => {
    setCriteria((prev) => prev.map((c) => (c.id === id && !c.lockedPass ? { ...c, result } : c)))
  }

  const onSaveDraft = () => {
    toast.success('Đã lưu nháp (local)')
  }

  const onComplete = () => {
    if (!allGraded) {
      toast.error('Vui lòng chấm hết tất cả mục')
      return
    }
    const score = Math.round((passedCount / total) * 100)
    const note = criteria.map((c) => `${c.title}: ${c.result === 'pass' ? 'Đạt' : 'Không đạt'} — ${c.comment || '—'}`).join('\n')
    gradeMutation.mutate(
      { examId, employeeId, score, note },
      {
        onSuccess: () => {
          toast.success('Đã gửi kết quả chấm. Quản lý thực hiện phân lớp / duyệt tiếp theo quy trình.')
          void navigate({ to: '/exam/grader' })
        },
      }
    )
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      {/* Sub header — bố cục giống code.html, màu/chữ theo app */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-card/50 px-6 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 overflow-hidden">
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#3D5066] hover:text-primary"
            onClick={() => void navigate({ to: '/exam/grader' })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="font-semibold">DS kỳ thi</span>
          </button>
          <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
          <p className="min-w-0 truncate text-xs text-[#3D5066]">
            Chấm thi: <span className="font-bold text-foreground">{examineeName}</span> · {levelBadge}
          </p>
          <span className="shrink-0 rounded-md border border-[#BBF7D0] bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-bold text-[#375623]">
            Bạn đang chấm với vai trò: {roleLabel} (được chỉ định)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-[#67E8F9] bg-[#CFFAFE] px-3.5 py-1.5 text-xs font-medium text-[#0E7490] hover:bg-[#B2E8E2]"
            onClick={onSaveDraft}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={gradeMutation.isPending}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-button bg-button px-3.5 py-1.5 text-xs font-medium text-button-foreground shadow-[var(--shadow-card)] hover:opacity-90 disabled:opacity-60"
            onClick={onComplete}
          >
            Hoàn thành chấm
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="page-shell">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            {criteria.map((c) => {
              const EvidenceIcon = evidenceIconForFilename(c.evidenceFile)
              return (
                <div
                  key={c.id}
                  className={cn(
                    'rounded-lg border p-6 shadow-[var(--shadow-card)]',
                    c.result === 'pass'
                      ? 'border-[#86EFAC] bg-[#F0FDF4]'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-xs font-bold text-foreground">{c.title}</h3>
                    {c.lockedPass ? (
                      <span className="shrink-0 rounded-full bg-[#DCFCE7] px-3 py-1 text-[10px] font-bold text-[#166534]">
                        Đạt
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-bold transition-colors',
                            c.result === 'pass'
                              ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]'
                              : 'border-border bg-card text-foreground hover:border-[#86EFAC]/60 hover:bg-[#F0FDF4] hover:text-[#166534]'
                          )}
                          onClick={() => setResult(c.id, 'pass')}
                        >
                          <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                          Đạt
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-bold transition-colors',
                            c.result === 'fail'
                              ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]'
                              : 'border-border bg-card text-foreground hover:border-[#FCA5A5]/70 hover:bg-[#FEF2F2] hover:text-[#991B1B]'
                          )}
                          onClick={() => setResult(c.id, 'fail')}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                          Không đạt
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#3D5066]/80">
                      Bằng chứng:
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <EvidenceIcon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {c.evidenceFile} · {c.evidenceSize}
                      </span>
                    </button>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#3D5066]/80">
                      {c.lockedPass ? 'Nhận xét của người chấm:' : 'Nhận xét:'}
                    </p>
                    {c.lockedPass ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm italic leading-relaxed text-foreground">
                        {c.comment}
                      </div>
                    ) : (
                      <textarea
                        className="min-h-[100px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-all placeholder:text-[#6B7F96]/50 focus:border-primary focus:ring-1 focus:ring-primary/25"
                        placeholder="Thêm nhận xét..."
                        value={c.comment}
                        onChange={(e) => setComment(c.id, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div
              className={cn(
                'rounded-lg border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <p className="mb-6 text-left text-[10px] font-bold uppercase tracking-wide text-[#6B7F96]">
                Thí sinh
              </p>
              <div
                className={cn(
                  'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold',
                  avatarClass
                )}
              >
                {initials}
              </div>
              <h4 className="text-xs font-semibold text-foreground">{examineeName}</h4>
              <p className="mb-6 text-[10px] text-[#6B7F96]">{examineeLine}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 text-left">
                <div>
                  <p className="text-[10px] font-medium text-[#6B7F96]">Lớp thi</p>
                  <p className="text-xs font-bold text-foreground">{className}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium text-[#6B7F96]">Nộp</p>
                  <p className="text-xs font-bold text-foreground">{submittedAt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#6B7F96]">Tiến độ chấm</p>
                  <p className="text-xs font-bold text-primary">
                    {gradedCount}/{total} mục
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(1)}
            >
              <p className="mb-6 text-[10px] font-bold uppercase tracking-wide text-[#6B7F96]">
                Tóm tắt chấm
              </p>
              <div className="mb-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7F96]">Đạt</span>
                  <span className="font-bold text-[#0E7490]">{passedCount} mục</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7F96]">Chưa chấm</span>
                  <span className="font-bold text-red-500">{pendingCount} mục</span>
                </div>
              </div>
              <div className="rounded-lg border border-primary/10 bg-primary/[0.06] p-3">
                <p className="text-[10px] italic leading-relaxed text-[#6B7F96]">
                  Chấm hết tất cả các mục trước khi sang bước Phân lớp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
