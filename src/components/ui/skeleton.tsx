import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Nền shimmer — class `.skeleton-shimmer` trong index.css */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('skeleton-shimmer rounded-md', className)} {...props} />
  )
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

/** Lưới thẻ nhân viên (ảnh + vài dòng) */
export function SkeletonEmployeeCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center rounded-2xl border border-border/90 bg-card p-4 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      <Skeleton className="mb-3 h-[72px] w-[72px] rounded-[20px]" />
      <Skeleton className="mb-2 h-4 w-3/4 max-w-[140px] rounded" />
      <Skeleton className="mb-4 h-3 w-1/2 max-w-[100px] rounded" />
      <div className="mt-auto w-full space-y-2 border-t border-border/60 pt-3">
        <Skeleton className="mx-auto h-3 w-full rounded" />
        <Skeleton className="mx-auto h-3 w-4/5 rounded" />
      </div>
    </div>
  )
}

export function SkeletonEmployeeCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
