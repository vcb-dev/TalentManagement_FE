import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useClassifyExam } from '@/features/exam/hooks'
import { findGraderExamRow } from '@/features/exam/mock/mockGraderExamRows'
import type { ExamResultCode } from '@/lib/constants'

const OPTIONS: {
  result: ExamResultCode
  title: string
  description: string
  titleClass: string
  borderActive: string
}[] = [
  {
    result: 'DAT',
    title: '✅ Đạt — Lên cấp độ / sao tiếp theo',
    description: 'Hệ thống cập nhật profile, mở checklist mới, thông báo Manager.',
    titleClass: 'text-[#166534]',
    borderActive: 'border-[#86EFAC] bg-[#F0FDF4]',
  },
  {
    result: 'BAO_LUU',
    title: '⚠️ Rớt lần 1 → Bảo lưu',
    description: 'Được thi lại sau thời gian chờ quy định. Vẫn học bình thường trong thời gian chờ.',
    titleClass: 'text-[#92400E]',
    borderActive: 'border-[#FCD34D] bg-[#FFFBEB]',
  },
  {
    result: 'CHO_HOC_LAI',
    title: '⚠️ Rớt lần 2 → Chờ lớp bảo lưu',
    description: 'Phải học lại toàn bộ nội dung sao đó. Hệ thống khóa nút thi đến khi hoàn thành lại.',
    titleClass: 'text-[#991B1B]',
    borderActive: 'border-[#FCA5A5] bg-[#FEF2F2]',
  },
  {
    result: 'CHIA_TAY',
    title: '🚫 Rớt lần 3 → Giải pháp chia tay',
    description: 'Kích hoạt quy trình offboard. Cần Manager và BOD xác nhận trước khi thực hiện.',
    titleClass: 'text-[#991B1B]',
    borderActive: 'border-[#FCA5A5] bg-[#FEF2F2]',
  },
]

export interface GraderPhanLopScreenProps {
  examId: string
  employeeId: string
  passCount?: number
  totalCount?: number
}

export function GraderPhanLopScreen({ examId, employeeId, passCount, totalCount }: GraderPhanLopScreenProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const classify = useClassifyExam()

  const row = findGraderExamRow(examId, employeeId)
  const examineeName = row?.examineeName ?? 'Thí sinh'
  const examineeLine = row?.examineeMeta ?? '—'
  const levelBadge = row?.levelBadge ?? '—'
  const className = row?.className ?? '—'
  const initials = row?.initials ?? 'TS'
  const avatarClass = row?.avatarClass ?? 'bg-primary/10 text-primary'

  const total = totalCount ?? 3
  const pass = passCount ?? 3
  const fail = Math.max(0, total - pass)
  const pct = total > 0 ? Math.round((pass / total) * 100) : 0

  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'

  const [selected, setSelected] = useState<ExamResultCode>('DAT')
  const [comment, setComment] = useState('')

  const onConfirm = () => {
    const c = comment.trim()
    if (!c) {
      toast.error('Vui lòng nhập nhận xét tổng kết kỳ thi')
      return
    }
    classify.mutate(
      { examId, employeeId, result: selected },
      {
        onSuccess: () => {
          toast.success('Đã xác nhận phân lớp')
          void navigate({ to: '/exam/grader' })
        },
      }
    )
  }

  return (
    <div
      className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8"
    >
      <div className="page-toolbar-flat">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10"
            onClick={() =>
              void navigate({
                to: '/exam/$examId/grade',
                params: { examId },
                search: { employeeId },
              })
            }
          >
            ← Chấm thi
          </button>
          <span className="text-xs text-muted-foreground">
            Phân lớp · <b className="text-foreground">{examineeName}</b> · {levelBadge}
          </span>
          <span className="ml-1 rounded-[10px] bg-[#EAF3DE] px-2 py-0.5 text-xs font-medium text-[#375623]">
            Bạn đang chấm với vai trò: {roleLabel} (được chỉ định)
          </span>
        </div>
        <button
          type="button"
          disabled={classify.isPending}
          className="whitespace-nowrap rounded-lg border border-button bg-button px-3.5 py-1.5 text-xs font-medium text-button-foreground hover:opacity-90 disabled:opacity-60"
          onClick={onConfirm}
        >
          {classify.isPending ? 'Đang gửi…' : 'Xác nhận phân lớp'}
        </button>
      </div>

      <div className="page-shell">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1fr_230px]">
          <div>
            <div className="mb-3 text-xs font-semibold text-foreground">Chọn kết quả kỳ thi:</div>
            <div className="space-y-2">
              {OPTIONS.map((opt) => {
                const active = selected === opt.result
                return (
                  <button
                    key={opt.result}
                    type="button"
                    onClick={() => setSelected(opt.result)}
                    className={cn(
                      'w-full rounded-[9px] border p-3 text-left transition-colors',
                      active ? cn('border-2', opt.borderActive) : 'border border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          'mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-2',
                          active ? 'border-button bg-button' : 'border-border bg-card'
                        )}
                        aria-hidden
                      >
                        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                      <div>
                        <div className={cn('text-xs font-medium', opt.titleClass)}>{opt.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{opt.description}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="phanlop-comment">
                Nhận xét tổng kết kỳ thi (bắt buộc)
              </label>
              <textarea
                id="phanlop-comment"
                className="min-h-[80px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Lý do phân lớp, nhận xét chung về kỳ thi..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
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
                Tổng kết chấm
              </div>
              <div className="space-y-0 p-4 text-xs">
                <div className="flex justify-between border-b border-border py-1.5">
                  <span className="text-[#6B7F96]">Tổng mục</span>
                  <span className="font-medium">{total}</span>
                </div>
                <div className="flex justify-between border-b border-border py-1.5">
                  <span className="text-[#6B7F96]">Đạt</span>
                  <span className="font-semibold text-[#0E7490]">{pass}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#6B7F96]">Không đạt</span>
                  <span className="font-medium">{fail}</span>
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="rounded-[9px] bg-[#DCFCE7] px-3 py-2 text-center">
                  <div className="text-xs text-[#166534]">Tỉ lệ đạt</div>
                  <div className="text-[22px] font-bold text-[#166534]">{pct}%</div>
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
                    <span className="text-[#6B7F96]">Lần thi</span>
                    <span className="font-medium text-foreground">Lần 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
