import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS = {
  active: { label: 'Đang mở', className: 'bg-success-muted text-success', dot: 'bg-success' },
  hidden: {
    label: 'Đang ẩn',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
} as const

/** Trạng thái lộ trình cho admin — cùng kiểu pill trạng thái của `ClassCard`. */
export function CourseStatusPill({
  isActive,
  className,
}: {
  isActive: boolean
  className?: string
}) {
  const status = isActive ? STATUS.active : STATUS.hidden
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        status.className,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden />
      {status.label}
    </span>
  )
}

/** Cho admin biết lộ trình nào đang hiện ở thẻ "Lộ trình đào tạo" trên trang cá nhân (tối đa 1). */
export function CourseDashboardPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full bg-button/10 px-2.5 py-0.5 text-xs font-semibold text-button',
        className
      )}
    >
      <Pin className="size-3" aria-hidden />
      Trang cá nhân
    </span>
  )
}
