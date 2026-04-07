import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import {
  MOCK_MANAGER_CLASSES,
  type ManagerClassCardVariant,
  type ManagerClassRow,
} from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const STATUS_LABEL: Record<ManagerClassRow['status'], { label: string; className: string }> = {
  open: { label: 'Đang mở', className: 'bg-white/20 text-white backdrop-blur-md' },
  full: { label: 'Đủ chỗ', className: 'bg-white/20 text-white backdrop-blur-md' },
  closed: { label: 'Đã đóng', className: 'bg-white/15 text-white/90' },
}

const HEADER_GRADIENT: Record<ManagerClassCardVariant, string> = {
  indigo: 'from-primary via-primary-600 to-primary-700',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
}

const PROGRESS_FILL: Record<ManagerClassCardVariant, string> = {
  indigo: 'bg-primary',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
}

const DOT_PATTERN =
  'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.35) 1px, transparent 0)'

function MemberAvatarStack({ count }: { count: number }) {
  const shown = Math.min(2, Math.max(0, count))
  const overflow = count > shown ? count - shown : 0
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[10px] font-bold text-primary-700',
            i === 0 ? 'from-primary-100 to-primary-200' : 'from-teal-100 to-teal-200 text-teal-800'
          )}
        >
          {i === 0 ? 'HV' : 'NV'}
        </div>
      ))}
      {overflow > 0 ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-muted text-[10px] font-bold text-muted-foreground">
          +{overflow}
        </div>
      ) : null}
    </div>
  )
}

export function ManagerClassesScreen() {
  const [rows] = useState(MOCK_MANAGER_CLASSES)
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [rows, query])

  const totalMembers = rows.reduce((a, r) => a + r.memberCount, 0)
  const openCount = rows.filter((r) => r.status === 'open').length

  const onCreate = () => {
    const n = name.trim()
    if (n.length < 3) {
      toast.error('Tên lớp ít nhất 3 ký tự')
      return
    }
    toast.success(`Đã tạo lớp “${n}” (demo — chưa lưu server)`)
    setName('')
  }

  const pageSubtitle =
    'Quản lý và điều phối học viên vào các lớp đào tạo chuyên môn theo đợt tuyển dụng hoặc lộ trình thăng tiến. Dữ liệu minh họa — sẵn sàng nối API.'

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Chia lớp học</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-primary/10">
              <Calendar className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              Học kỳ Q2 / 2026
            </span>
          </div>
        </div>

        {/* Stats — bento (cùng khối spacing với màn team-progress) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div
          className={cn(
            'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
            <Building2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Lớp đang mở
            </div>
            <div className="text-2xl font-bold text-foreground">{openCount}</div>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Users className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Tổng học viên
            </div>
            <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <BookOpen className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Lớp trong kỳ
            </div>
            <div className="text-2xl font-bold text-foreground">{rows.length}</div>
          </div>
        </div>
        <Link
          to="/manager/exam-schedule"
          className={cn(
            'group relative flex flex-col justify-between overflow-hidden rounded-xl border-none bg-gradient-to-br from-primary to-primary-600 p-5 text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="relative z-10">
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">Liên kết nhanh</div>
            <div className="mt-1 text-lg font-bold">Đặt lịch thi</div>
          </div>
          <div className="relative z-10 flex justify-end">
            <ArrowRight className="h-6 w-6 text-white/50 transition-colors group-hover:text-white" strokeWidth={2} />
          </div>
          <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        </Link>
        </div>
      </div>

      {/* Tìm kiếm + lọc + tạo */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="group relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên lớp, ví dụ: Tập sự — Đợt Q2/2026"
            className="w-full rounded-xl border border-transparent bg-muted/80 py-3 pl-11 pr-4 text-sm shadow-inner outline-none ring-offset-background transition-all placeholder:text-muted-foreground focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex shrink-0 gap-3">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
            onClick={() => toast.info('Bộ lọc — nối API')}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            Bộ lọc
          </Button>
          <div className="hidden min-w-[12rem] flex-1 flex-col gap-2 sm:flex sm:min-w-0 sm:flex-row sm:items-stretch">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên lớp mới"
              className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none ring-offset-background focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              type="button"
              className="gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-md"
              onClick={onCreate}
            >
              <PlusCircle className="h-4 w-4" strokeWidth={2} />
              Tạo lớp
            </Button>
          </div>
        </div>
      </div>
      <div className="mb-6 flex flex-col gap-2 sm:hidden">
        <label htmlFor="new-class-mobile" className="text-xs font-semibold text-muted-foreground">
          Tạo lớp mới
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="new-class-mobile"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên lớp mới"
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button type="button" className="gap-2 rounded-xl font-bold" onClick={onCreate}>
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
            Tạo lớp
          </Button>
        </div>
      </div>

      {/* Lưới lớp */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          const st = STATUS_LABEL[row.status]
          const header = HEADER_GRADIENT[row.cardVariant]
          const bar = PROGRESS_FILL[row.cardVariant]
          const done = row.progressPercent >= 100
          return (
            <div
              key={row.id}
              className={cn(
                'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-xl',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div
                className={cn(
                  'relative h-24 overflow-hidden bg-gradient-to-r p-6',
                  header
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage: DOT_PATTERN,
                    backgroundSize: '20px 20px',
                  }}
                />
                <span
                  className={cn(
                    'relative z-10 mb-2 inline-block rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider',
                    st.className
                  )}
                >
                  {st.label}
                </span>
                <h3 className="relative z-10 text-lg font-bold leading-tight text-white">{row.name}</h3>
              </div>
              <div className="p-6">
                <div className="mb-6 flex items-center gap-4">
                  <MemberAvatarStack count={row.memberCount} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {row.memberCount} thành viên
                  </span>
                </div>
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Kỳ thi dự kiến:</span>
                    <span className="font-bold text-foreground">{row.examDateShort}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', bar)}
                      style={{ width: `${Math.min(100, row.progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Tiến độ học</span>
                    <span>{done ? 'Hoàn thành' : `${row.progressPercent}%`}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto rounded-lg py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() =>
                      toast.info('Chi tiết lớp & danh sách học viên — nối API (Teacher xem cùng dữ liệu).')
                    }
                  >
                    Chi tiết lớp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-lg border-primary/25 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                    asChild
                  >
                    <Link to="/exam/$examId/classify" params={{ examId: '11111111-1111-4111-8111-111111111101' }}>
                      Phân lớp sau thi
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Cập nhật {row.updatedAt}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/90">{row.levelLabel}</span>
                  {' · '}
                  {row.examLabel}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Không có lớp khớp tìm kiếm.</p>
      ) : null}

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          onClick={() => toast.info('Danh sách đầy đủ — nối API phân trang')}
        >
          Xem thêm tất cả các lớp
        </button>
      </div>
    </ManagerScreenLayout>
  )
}
