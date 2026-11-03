import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Icon nhỏ cạnh tiêu đề (lucide, ~size-5). */
  icon?: ReactNode
  children: ReactNode
  /** Thanh hành động cố định dưới đáy — luôn thấy nút Lưu dù nội dung dài. */
  footer: ReactNode
  /** Form dài (vd. soạn đề): chặn đóng khi bấm ra ngoài / Esc để không mất dữ liệu đang nhập. */
  preventDismiss?: boolean
  className?: string
}

/** Modal form: header + nội dung cuộn riêng + footer cố định, render qua portal (phủ cả sidebar/header). */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  preventDismiss,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92dvh,900px)] max-w-2xl flex-col gap-0 overflow-hidden p-0',
          // Control trong modal (Select, Checkbox, vòng focus) theo màu thương hiệu xanh thay vì tím mặc định.
          '[--primary:var(--button)] [--ring:var(--button)] dark:[--primary:158_64%_52%] dark:[--ring:158_64%_52%]',
          className
        )}
        onInteractOutside={preventDismiss ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={preventDismiss ? (e) => e.preventDefault() : undefined}
        // Không có mô tả → báo Radix bỏ qua aria-describedby (tránh cảnh báo console).
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader className="border-b border-border/70 px-6 py-4 pr-14">
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-button/10 text-button">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-0.5">{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {children}
        </div>
        <div className="border-t border-border/70 bg-muted/30 px-6 py-3.5">{footer}</div>
      </DialogContent>
    </Dialog>
  )
}
