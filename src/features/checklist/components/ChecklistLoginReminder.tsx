import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, CircleDashed, ClipboardList, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth.store'
import { useLeaderChecklistEmployees, useMyChecklists } from '../hooks'
import {
  checklistReminderCopy,
  pendingChecklists,
  useChecklistReminderStore,
  type ChecklistReminderTarget,
  type PendingChecklists,
} from '../loginReminder'

function ReminderRow({
  icon,
  title,
  meta,
  onClick,
}: {
  icon: ReactNode
  title: string
  meta: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-left transition-colors hover:border-button/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-muted text-warning">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {meta} · <span className="font-medium text-warning">Chưa điền</span>
          </span>
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </li>
  )
}

/**
 * Ngay sau khi đăng nhập: còn checklist tự điền / checklist trưởng nhóm chưa điền thì hiện hộp
 * thông báo giữa màn hình trên trang vừa vào, bấm là mở thẳng checklist cần điền.
 * Gắn trong AppShell.
 */
export function ChecklistLoginReminder() {
  const pending = useChecklistReminderStore((s) => s.pending)
  const clear = useChecklistReminderStore((s) => s.clear)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  // Tài khoản admin dùng chung không tự điền / không phụ trách ai.
  const isStaff = user != null && !user.isAdminAccount
  const enabled = pending && isStaff
  const mine = useMyChecklists(enabled)
  const leader = useLeaderChecklistEmployees(enabled)
  const [reminder, setReminder] = useState<PendingChecklists | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pending) return
    if (!isStaff) {
      clear()
      return
    }
    if (mine.isPending || leader.isPending) return
    clear()
    setReminder(pendingChecklists(mine.data, leader.data))
  }, [pending, isStaff, mine.isPending, mine.data, leader.isPending, leader.data, clear])

  // Đăng xuất khi hộp còn mở thì đóng luôn.
  useEffect(() => {
    if (!user) setReminder(null)
  }, [user])

  if (!reminder) return null
  const copy = checklistReminderCopy(reminder)
  const go = (search: ChecklistReminderTarget) => {
    setReminder(null)
    void navigate({ to: '/checklists', search })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && setReminder(null)}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        // Mặc định Radix focus dòng đầu danh sách (trông như đang được chọn) — focus nút chính thay vào.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          primaryRef.current?.focus()
        }}
      >
        <div className="flex flex-col items-center bg-gradient-to-b from-warning-muted/70 to-transparent px-6 pb-5 pt-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-warning-muted text-warning ring-8 ring-warning-muted/40">
            <ClipboardList className="size-8" strokeWidth={1.75} aria-hidden />
          </span>
          <DialogTitle className="mt-5 text-xl font-bold">{copy.title}</DialogTitle>
          <DialogDescription className="mt-2 max-w-sm leading-relaxed">
            {copy.description}
          </DialogDescription>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto px-6">
          {reminder.self.map((item) => (
            <ReminderRow
              key={item.id}
              icon={<CircleDashed className="size-[18px]" aria-hidden />}
              title={item.title}
              meta={`${item.questionCount} câu hỏi`}
              onClick={() => go({ tab: 'mine', templateId: item.id })}
            />
          ))}
          {reminder.leaderEmployeeCount > 0 ? (
            <ReminderRow
              icon={<Users className="size-[18px]" aria-hidden />}
              title="Nhân sự bạn phụ trách"
              meta={`${reminder.leaderEmployeeCount} nhân sự`}
              onClick={() => go({ tab: 'leader' })}
            />
          ) : null}
        </ul>

        <DialogFooter className="px-6 pb-6 pt-5">
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1"
            onClick={() => setReminder(null)}
          >
            Để sau
          </Button>
          <Button
            ref={primaryRef}
            type="button"
            className="sm:flex-1"
            onClick={() => go(copy.primary)}
          >
            Điền ngay
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
