import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Nền shimmer — class `.skeleton-shimmer` trong index.css */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} {...props} />
}

export function SkeletonAvatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-10 w-10 shrink-0 rounded-full', className)} {...props} />
}

/** Một hàng giống thẻ duyệt: avatar + 2 dòng + badge + cột nút (kiểu Tiimi / queue SaaS) */
export function SkeletonApprovalCardRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-[9px] border border-border/80 bg-card p-4 shadow-[0_1px_3px_rgba(30,58,95,.04)]',
        className
      )}
      {...props}
    >
      <SkeletonAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-[min(220px,55%)] rounded" />
        <Skeleton className="h-3 w-full max-w-md rounded" />
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="ml-auto flex shrink-0 flex-col gap-1.5 self-center sm:ml-0">
        <Skeleton className="h-8 w-[92px] rounded-[9px]" />
        <Skeleton className="h-8 w-[88px] rounded-[9px]" />
      </div>
    </div>
  )
}

export function SkeletonApprovalCardList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy aria-label="Đang tải danh sách">
      <span className="sr-only">Đang tải…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonApprovalCardRow key={i} />
      ))}
    </div>
  )
}

/** Lưới thẻ nhân viên — bố cục giống EmployeeCard (mock HTML) */
export function SkeletonEmployeeCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col rounded-2xl border border-border/90 bg-card p-5 shadow-sm',
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
      className="grid grid-cols-2 gap-3 gap-y-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
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

/** Ô thống kê nhỏ (dashboard HR / manager) */
export function SkeletonStatTile({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-card p-3.5 shadow-[var(--shadow-card)] ring-1 ring-border/40',
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

/** Skeleton trang chung — dùng cho Suspense fallback của các lazy route */
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
