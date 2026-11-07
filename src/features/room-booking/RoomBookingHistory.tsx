import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, History, Paperclip, Plus, Search, Siren } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { getMyBookings, type MeetingBooking } from './api'
import { RoomBookingMinutesCell } from './RoomBookingMinutesCell'
import {
  HISTORY_FILTERS,
  countByCategory,
  filterHistory,
  weekdayShortVi,
  type HistoryFilter,
} from './roomBookingHistoryFilters'
import { getBookingDisplayStatus } from './roomBookingStatus'
import { formatDateVi, formatTimeRangeVi } from './roomBookingTimeUtils'

const PAGE_SIZE = 10

/** Cột bảng trên màn rộng; màn hẹp mỗi dòng xếp chồng. */
const ROW_GRID =
  'md:grid md:grid-cols-[150px_minmax(0,1fr)_96px_150px_170px_16px] md:items-center md:gap-4'

type VnTime = { date: string; time: string }

function HistoryRow({
  b,
  vnTime,
  onOpen,
}: {
  b: MeetingBooking
  vnTime: VnTime
  onOpen: (b: MeetingBooking) => void
}) {
  const status = getBookingDisplayStatus(b, vnTime)
  const docCount = b.documents?.length ?? 0
  return (
    // Nội dung là nút mở chi tiết, `after:` phủ cả dòng; ô biên bản (có nút tải lên) nằm trên lớp phủ.
    <li
      className={cn(
        'group relative flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/30',
        ROW_GRID
      )}
    >
      <div className="flex items-start justify-between gap-3 md:block">
        <div className="text-sm">
          <p className="font-semibold tabular-nums text-foreground">
            <span className="text-muted-foreground">{weekdayShortVi(b.date)},</span>{' '}
            {formatDateVi(b.date)}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatTimeRangeVi(b.timeFrom, b.timeTo)}
          </p>
        </div>
        <StatusPill status={status} className="md:hidden" />
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(b)}
          className="block w-full text-left text-sm font-semibold text-foreground after:absolute after:inset-0 group-hover:text-[#006C49] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[#006C49]/50"
        >
          <span className="line-clamp-2 break-words">{b.reason}</span>
        </button>
        {b.isEmergency || docCount > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {b.isEmergency ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <Siren className="size-3.5" aria-hidden />
                Khẩn cấp
              </span>
            ) : null}
            {docCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3.5" aria-hidden />
                {docCount} tài liệu
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground md:text-sm md:text-foreground">
        <span className="md:hidden">Phòng: </span>
        <span className="font-medium text-foreground">{b.room}</span>
      </p>

      <div className="hidden md:block">
        <StatusPill status={status} />
      </div>

      <div className="relative z-10 w-fit">
        <RoomBookingMinutesCell booking={b} vnTime={vnTime} compact isOwner />
      </div>

      <ChevronRight
        className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#006C49] md:block"
        aria-hidden
      />
    </li>
  )
}

function StatusPill({
  status,
  className,
}: {
  status: ReturnType<typeof getBookingDisplayStatus>
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        status.className,
        status.pulse && 'animate-pulse',
        className
      )}
    >
      {status.text}
    </span>
  )
}

/**
 * Lịch sử đặt phòng của chính người đang đăng nhập (mọi vai trò) — toàn bộ thời gian, mới nhất trước.
 * Bấm dòng mở chi tiết (sửa / huỷ nếu còn được); nộp BBH ngay trên dòng.
 */
export function RoomBookingHistory({
  vnTime,
  onOpen,
  onCreate,
}: {
  vnTime: VnTime
  onOpen: (b: MeetingBooking) => void
  onCreate: () => void
}) {
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    // Cùng tiền tố `room-bookings` — mọi thao tác đặt / sửa / huỷ trên trang đều làm mới danh sách này.
    queryKey: ['room-bookings', 'my'],
    queryFn: getMyBookings,
    staleTime: 30_000,
  })
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => countByCategory(items, vnTime), [items, vnTime])
  const rows = useMemo(
    () => filterHistory(items, vnTime, filter, query),
    [items, vnTime, filter, query]
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (isError) {
    return (
      <ErrorState
        title="Không tải được lịch sử đặt phòng"
        description={getApiErrorMessage(error)}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-7" />}
        title="Bạn chưa đặt phòng họp nào"
        description="Các lịch bạn đặt — kể cả đã họp xong hoặc bị từ chối — sẽ được lưu lại ở đây."
        action={
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            Đặt phòng ngay
          </Button>
        }
        className="rounded-2xl border border-dashed border-border bg-card"
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo trạng thái">
          {HISTORY_FILTERS.map((f) => {
            const active = filter === f.value
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(f.value)
                  setPage(1)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006C49]/40',
                  active
                    ? 'bg-[#006C49] text-white'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 tabular-nums',
                    active ? 'bg-white/20' : 'bg-background text-foreground'
                  )}
                >
                  {counts[f.value]}
                </span>
              </button>
            )
          })}
        </div>
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm nội dung, phòng, ngày…"
            aria-label="Tìm trong lịch sử đặt phòng"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div
          className={cn(
            'hidden border-b border-border/50 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground',
            ROW_GRID
          )}
        >
          <span>Thời gian</span>
          <span>Nội dung</span>
          <span>Phòng</span>
          <span>Trạng thái</span>
          <span>Biên bản</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Không có lịch nào khớp bộ lọc.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {pageRows.map((b) => (
              <HistoryRow key={b.id} b={b} vnTime={vnTime} onOpen={onOpen} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/10 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} /{' '}
              {rows.length} lịch
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 text-xs font-semibold tabular-nums text-foreground">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                aria-label="Trang sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
