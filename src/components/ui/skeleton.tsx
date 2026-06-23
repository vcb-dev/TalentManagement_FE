import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} aria-hidden {...props} />
}

export function SkeletonAvatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-10 w-10 shrink-0 rounded-full', className)} {...props} />
}

export function SkeletonTextLine({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} {...props} />
}

export function SkeletonCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    />
  )
}

export function SkeletonTableRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-3 border-b border-border px-4 py-3', className)} {...props} />
}

export function SkeletonApprovalCardRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      <SkeletonAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-[min(220px,55%)] rounded" />
        <Skeleton className="h-3 w-full max-w-md rounded" />
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="ml-auto flex shrink-0 flex-col gap-1.5 self-center sm:ml-0">
        <Skeleton className="h-8 w-[92px] rounded-md" />
        <Skeleton className="h-8 w-[88px] rounded-md" />
      </div>
    </div>
  )
}

export function SkeletonApprovalCardList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy aria-label="Đang tải danh sách">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonApprovalCardRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonEmployeeCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      <div className="mb-5 flex justify-between gap-3">
        <Skeleton className="h-[5.25rem] w-[5.25rem] shrink-0 rounded-2xl sm:h-[5.75rem] sm:w-[5.75rem]" />
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-5 w-[6.5rem] rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </div>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-3.5 w-1/2 rounded" />
        <Skeleton className="h-3.5 w-2/3 rounded" />
      </div>
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-4 w-8 shrink-0 rounded" />
      </div>
      <div className="mt-auto flex gap-2">
        <Skeleton className="h-9 min-h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-10 shrink-0 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonEmployeeCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
      role="status"
      aria-busy
      aria-label="Đang tải danh sách nhân viên"
    >
      <span className="sr-only">Đang tải…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonEmployeeCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonStatTile({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      <Skeleton className="mb-2 h-3 w-24 rounded" />
      <Skeleton className="mb-1 h-8 w-16 rounded-md" />
      <Skeleton className="h-3 w-28 rounded" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-5 w-96 rounded-md" />
        </div>
        <Skeleton className="h-12 w-48 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="h-[420px] rounded-[1.75rem]" />
        <Skeleton className="h-[420px] rounded-[1.75rem] lg:col-span-3" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-in fade-in space-y-5 px-4 py-8 duration-300">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonClassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <Skeleton className="h-6 w-3/5 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-4 w-2/3 rounded" />
      <Skeleton className="mb-4 h-4 w-1/2 rounded" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonClassCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 items-start md:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-busy
      aria-label="Đang tải danh sách lớp"
    >
      <span className="sr-only">Đang tải…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonClassCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTableRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid gap-3 border-b border-border px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn('h-4 rounded', colIdx === 0 ? 'w-3/4' : 'w-full')}
            />
          ))}
        </div>
      ))}
    </>
  )
}

export function SkeletonDataTableBody({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border">
          {Array.from({ length: columns }, (_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <Skeleton className={cn('h-4 rounded', colIdx === 0 ? 'w-3/4' : 'w-full')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonSubmissionCardList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6" role="status" aria-busy aria-label="Đang tải danh sách">
      <span className="sr-only">Đang tải…</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-[24px]" />
      ))}
    </div>
  )
}

export function SkeletonExamScheduleTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      role="status"
      aria-busy
      aria-label="Đang tải lịch thi"
    >
      <span className="sr-only">Đang tải lịch thi…</span>
      <div className="space-y-0 divide-y divide-border md:hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <div className="border-b bg-muted/30 px-5 py-4">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-16 justify-self-end rounded" />
          </div>
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 border-b px-5 py-5">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-8 w-20 justify-self-end rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Khối skeleton bảng KPI/OKR — workspace và tổng chỉ số. */
export function SkeletonKpiTableSection({
  label = 'Đang tải dữ liệu KPI/OKR',
  className,
  id,
}: {
  label?: string
  className?: string
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        'space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5',
        className
      )}
      role="status"
      aria-busy
      aria-label={label}
    >
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-6 w-2/5 max-w-xs rounded-lg" />
      <SkeletonDataTableBody columns={4} rows={5} />
    </div>
  )
}

export function SkeletonProfileForm() {
  return (
    <div className="space-y-6" role="status" aria-busy aria-label="Đang tải hồ sơ">
      <span className="sr-only">Đang tải hồ sơ…</span>
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}
