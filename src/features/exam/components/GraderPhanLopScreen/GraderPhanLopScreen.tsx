import { useNavigate } from '@tanstack/react-router'
import { Award, CheckCircle2, ChevronRight, Info, Sparkles } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import {
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { useClassifyExam } from '@/features/exam/hooks'
import { findGraderExamRow } from '@/features/exam/mock/mockGraderExamRows'
import type { ExamResultCode } from '@/lib/constants'

const COMMENT_TEMPLATE_PASS =
  'Thí sinh đạt yêu cầu kỳ thi. Trình bày rõ ràng, đáp ứng đủ các tiêu chí chấm và thể hiện thái độ học tập tích cực.'
const COMMENT_TEMPLATE_FAIL =
  'Thí sinh chưa đạt yêu cầu. Cần bổ sung kiến thức, luyện tập thêm và xem lại tài liệu trước khi thi lại.'

const OPTIONS: {
  result: ExamResultCode
  title: string
  description: string
  titleClass: string
  borderActive: string
  danger?: boolean
}[] = [
  {
    result: 'DAT',
    title: 'Đạt — Lên cấp độ / sao tiếp theo',
    description:
      'Hệ thống cập nhật profile, mở checklist mới, tự động gửi thông báo chúc mừng tới Manager trực tiếp.',
    titleClass: 'text-success',
    borderActive: 'border-success/40 bg-success-muted/80',
  },
  {
    result: 'BAO_LUU',
    title: 'Rớt lần 1 — Bảo lưu',
    description:
      'Kết quả được bảo lưu. Thí sinh được quyền đăng ký thi lại sau thời gian chờ quy định (thường là 14 ngày).',
    titleClass: 'text-warning',
    borderActive: 'border-amber-300 bg-warning-muted/90',
  },
  {
    result: 'CHO_HOC_LAI',
    title: 'Rớt lần 2 — Chờ lớp bảo lưu',
    description:
      'Bắt buộc phải tham gia học lại toàn bộ nội dung của cấp độ sao hiện tại trước khi được phép đăng ký thi lại lần cuối.',
    titleClass: 'text-danger',
    borderActive: 'border-red-300 bg-danger-muted/90',
  },
  {
    result: 'CHIA_TAY',
    title: 'Rớt lần 3 — Giải pháp chia tay',
    description:
      'Kích hoạt quy trình offboard chuyên nghiệp. Thông báo cho bộ phận nhân sự và quản lý trực tiếp để xử lý thủ tục.',
    titleClass: 'text-danger',
    borderActive: 'border-red-400 bg-danger-muted',
    danger: true,
  },
]

function tierLabelFromPct(pct: number): string {
  if (pct >= 100) return 'XUẤT SẮC'
  if (pct >= 80) return 'TỐT'
  if (pct >= 60) return 'KHÁ'
  return 'CẦN CẢI THIỆN'
}

export interface GraderPhanLopScreenProps {
  examId: string
  employeeId: string
  passCount?: number
  totalCount?: number
}

export function GraderPhanLopScreen({
  examId,
  employeeId,
  passCount,
  totalCount,
}: GraderPhanLopScreenProps) {
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
  const tierLabel = tierLabelFromPct(pct)
  const bonusPts = Math.min(150, Math.round((pct / 100) * 150))

  const roleLabel = user ? ROLE_LABEL_VI[user.role] : '—'

  const classifyForm = useForm<{ selected: ExamResultCode; comment: string }>({
    defaultValues: { selected: 'DAT', comment: '' },
  })
  const selected = useWatch({ control: classifyForm.control, name: 'selected' }) ?? 'DAT'
  const comment = useWatch({ control: classifyForm.control, name: 'comment' }) ?? ''

  const onConfirm = () => {
    const c = comment.trim()
    if (!c) {
      toast.error('Vui lòng nhập nhận xét tổng kết kỳ thi')
      return
    }
    classify.mutate(
      { examId, employeeId, result: classifyForm.getValues('selected') },
      {
        onSuccess: () => {
          toast.success('Đã xác nhận phân lớp')
          void navigate({ to: '/exam/grader' })
        },
      }
    )
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-flat flex-col items-stretch gap-0 border-b-0 py-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-3.5">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <button
              type="button"
              className="text-foreground hover:text-primary"
              onClick={() =>
                void navigate({
                  to: '/exam/$examId/grade',
                  params: { examId },
                  search: { employeeId },
                })
              }
            >
              Chấm thi
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            <span>Phân lớp</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="normal-case tracking-normal text-primary">
              Thí sinh — {examineeName} (đang chấm)
            </span>
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className={cn('min-w-0 flex-1 text-balance', PAGE_HEADER_SURFACE)}>
              <h1 className={cn(PAGE_HEADER_TITLE, 'text-xl md:text-2xl')}>
                <span className={PAGE_HEADER_GRADIENT}>Xác nhận kết quả kỳ thi</span>
              </h1>
            </div>
            <span className="w-fit rounded-[10px] bg-active-tag-bg px-2 py-0.5 text-xs font-medium text-active-tag-text">
              Bạn đang chấm với vai trò: {roleLabel} (được chỉ định)
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border px-6 py-3">
          <button
            type="button"
            disabled={classify.isPending}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-button bg-button px-5 py-2.5 text-xs font-semibold text-button-foreground shadow-[var(--shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-60"
            onClick={onConfirm}
          >
            {classify.isPending ? 'Đang gửi…' : 'Xác nhận phân lớp'}
            <CheckCircle2 className="h-4 w-4 opacity-90" aria-hidden />
          </button>
        </div>
      </div>

      <div className="page-shell">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
                <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-foreground">
                  <span className="h-6 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Quyết định kết quả phân lớp
                </h2>
                <div className="space-y-3">
                  {OPTIONS.map((opt, idx) => {
                    const active = selected === opt.result
                    return (
                      <label
                        key={opt.result}
                        className={cn(
                          'group relative flex cursor-pointer items-start gap-4 rounded-2xl border border-transparent p-4 transition-all md:p-5',
                          opt.danger
                            ? 'hover:border-danger-muted hover:bg-danger-muted/40'
                            : 'hover:border-primary/15 hover:bg-primary/5',
                          active && cn('border-2', opt.borderActive)
                        )}
                      >
                        <input
                          type="radio"
                          name="phanlop-result"
                          className={cn(
                            'mt-1 h-4 w-4 shrink-0 border-border text-primary focus:ring-primary/30',
                            opt.danger && 'text-danger focus:ring-danger/30'
                          )}
                          checked={active}
                          onChange={() => classifyForm.setValue('selected', opt.result)}
                        />
                        <div className="min-w-0 flex-1">
                          <span className={cn('block text-sm font-bold', opt.titleClass)}>
                            {opt.title}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                            {opt.description}
                          </span>
                        </div>
                        {idx === 0 ? (
                          <Sparkles
                            className="h-5 w-5 shrink-0 text-success opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-foreground">Nhận xét tổng kết kỳ thi</h2>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Bắt buộc
                  </span>
                </div>
                <Controller
                  control={classifyForm.control}
                  name="comment"
                  render={({ field }) => (
                    <textarea
                      id="phanlop-comment"
                      className="h-40 w-full resize-y rounded-xl border-0 bg-muted/80 px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition-[box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/35"
                      placeholder="Nhập những lưu ý quan trọng, điểm mạnh và điểm cần cải thiện của thí sinh trong kỳ thi này..."
                      {...field}
                    />
                  )}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
                    onClick={() => classifyForm.setValue('comment', COMMENT_TEMPLATE_PASS)}
                  >
                    Dùng mẫu nhận xét Đạt
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-muted px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/80"
                    onClick={() => classifyForm.setValue('comment', COMMENT_TEMPLATE_FAIL)}
                  >
                    Dùng mẫu nhận xét Rớt
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <div
                className={cn(
                  'relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 shadow-[var(--shadow-card)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(0)}
              >
                <div
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.06]"
                  aria-hidden
                />
                <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Thông tin thí sinh
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        'flex h-16 w-16 items-center justify-center rounded-2xl text-base font-bold ring-4 ring-primary/10',
                        avatarClass
                      )}
                    >
                      {initials}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-success text-[10px] font-bold text-white"
                      aria-hidden
                    >
                      ✓
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{examineeName}</h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      Thông tin: <span className="text-primary">{examineeLine}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-between gap-4 border-t border-border pt-6">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                      Cấp / sao (mục tiêu)
                    </p>
                    <p className="text-sm font-bold text-foreground">{levelBadge}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                      Lớp thi
                    </p>
                    <p className="text-sm font-bold text-primary">{className}</p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'relative overflow-hidden rounded-2xl bg-primary-700 p-6 text-primary-foreground shadow-[var(--shadow-ui-float)]',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(1)}
              >
                <div
                  className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5"
                  aria-hidden
                />
                <div className="relative mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-100/90">
                      Tổng kết chấm bài
                    </h4>
                    <p className="text-xl font-black tracking-tight">Xếp loại: {tierLabel}</p>
                  </div>
                  <Award className="h-10 w-10 shrink-0 text-amber-300" aria-hidden />
                </div>
                <div className="relative space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-xs font-bold">
                      <span className="text-primary-100/85">Tỷ lệ đạt mục tiêu</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-primary-100/75">
                      Không đạt: {fail} mục
                    </p>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] font-bold uppercase text-primary-100/80">
                        Mục tiêu đạt
                      </p>
                      <p className="text-xl font-bold">
                        {pass}/{total}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] font-bold uppercase text-primary-100/80">
                        Điểm thưởng
                      </p>
                      <p className="text-xl font-bold">+{bonusPts}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex gap-4 rounded-2xl border border-amber-200/80 bg-warning-muted/60 p-5"
                style={staggerStyle(2)}
              >
                <Info className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-bold">Lưu ý cho Quản lý:</span> Việc phê duyệt kết quả này
                  sẽ ảnh hưởng trực tiếp đến lộ trình thăng tiến và lương thưởng của nhân sự. Vui
                  lòng kiểm tra kỹ nhận xét trước khi xác nhận.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
