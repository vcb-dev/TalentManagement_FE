import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
      <div className="page-toolbar-flat">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10"
            onClick={() => void navigate({ to: '/exam/grader' })}
          >
            ← DS kỳ thi
          </button>
          <span className="text-xs text-[#3D5066]">
            Chấm thi · <b className="text-foreground">{examineeName}</b> · {levelBadge}
          </span>
          <span className="ml-1 rounded-[10px] bg-[#EAF3DE] px-2 py-0.5 text-xs font-medium text-[#375623]">
            Bạn đang chấm với vai trò: {roleLabel} (được chỉ định)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-[9px] border border-[#67E8F9] bg-[#CFFAFE] px-3.5 py-1.5 text-xs font-medium text-[#0E7490] hover:bg-[#B2E8E2]"
            onClick={onSaveDraft}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={gradeMutation.isPending}
            className="whitespace-nowrap rounded-lg border border-button bg-button px-3.5 py-1.5 text-xs font-medium text-button-foreground hover:opacity-90 disabled:opacity-60"
            onClick={onComplete}
          >
            Hoàn thành chấm →
          </button>
        </div>
      </div>

      <div className="page-shell">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            {criteria.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-[9px] border p-3',
                  c.result === 'pass' ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-border bg-card'
                )}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-foreground">{c.title}</div>
                  {c.lockedPass ? (
                    <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534]">
                      Đạt
                    </span>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          'rounded-[9px] border px-2.5 py-1 text-xs font-medium',
                          c.result === 'pass'
                            ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        )}
                        onClick={() => setResult(c.id, 'pass')}
                      >
                        ✓ Đạt
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'rounded-[9px] border px-2.5 py-1 text-xs font-medium',
                          c.result === 'fail'
                            ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        )}
                        onClick={() => setResult(c.id, 'fail')}
                      >
                        ✗ Không đạt
                      </button>
                    </div>
                  )}
                </div>
                <div className="mb-2 text-sm text-[#3D5066]">
                  Bằng chứng:{' '}
                  <button type="button" className="cursor-pointer font-medium text-primary hover:underline">
                    {c.evidenceFile}
                  </button>{' '}
                  · {c.evidenceSize}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3D5066]">
                    {c.lockedPass ? 'Nhận xét của người chấm' : 'Nhận xét'}
                  </label>
                  {c.lockedPass ? (
                    <input
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={c.comment}
                      onChange={(e) => setComment(c.id, e.target.value)}
                    />
                  ) : (
                    <textarea
                      className="min-h-[50px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Thêm nhận xét..."
                      value={c.comment}
                      onChange={(e) => setComment(c.id, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(0)}
            >
              <div className="card-section-header font-bold">
                Thí sinh
              </div>
              <div className="p-4 text-center">
                <div
                  className={cn(
                    'mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                    avatarClass
                  )}
                >
                  {initials}
                </div>
                <div className="text-xs font-semibold text-foreground">{examineeName}</div>
                <div className="text-sm text-[#6B7F96]">{examineeLine}</div>
                <div className="my-3 h-px bg-border" />
                <div className="space-y-1 text-left text-xs">
                  <div className="flex justify-between gap-2 py-0.5">
                    <span className="text-[#6B7F96]">Lớp thi</span>
                    <span className="font-medium text-foreground">{className}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-0.5">
                    <span className="text-[#6B7F96]">Nộp</span>
                    <span className="font-medium text-foreground">{submittedAt}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-0.5">
                    <span className="text-[#6B7F96]">Tiến độ chấm</span>
                    <span className="font-medium text-foreground">
                      {gradedCount}/{total} mục
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
              style={staggerStyle(1)}
            >
              <div className="card-section-header font-bold">
                Tóm tắt chấm
              </div>
              <div className="space-y-1 p-4 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-[#6B7F96]">Đạt</span>
                  <span className="font-semibold text-[#0E7490]">{passedCount} mục</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#6B7F96]">Chưa chấm</span>
                  <span className="font-semibold text-foreground">{pendingCount} mục</span>
                </div>
                <div className="my-2 h-px bg-border" />
                <p className="text-xs leading-snug text-[#6B7F96]">
                  Chấm hết tất cả mục trước khi sang bước Phân lớp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
