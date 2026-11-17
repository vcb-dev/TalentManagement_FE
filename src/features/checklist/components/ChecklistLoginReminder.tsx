import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  UserRound,
  UserRoundPen,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth.store'
import { useMeUserSelf } from '@/features/profile/hooks'
import {
  missingProfileFields,
  summarizeMissingFields,
} from '@/features/profile/profileCompleteness'
import { useLeaderChecklistEmployees, useMyChecklists } from '../hooks'
import {
  loginReminder,
  loginReminderCopy,
  pendingChecklists,
  useChecklistReminderStore,
  type LoginReminder,
  type LoginReminderTarget,
} from '../loginReminder'

function ReminderRow({
  icon,
  title,
  meta,
  status = 'Chưa điền',
  onClick,
}: {
  icon: ReactNode
  title: string
  meta: string
  status?: string
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
            {meta} · <span className="font-medium text-warning">{status}</span>
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
 * Ngay sau khi đăng nhập: còn checklist tự điền / checklist trưởng nhóm chưa điền, hoặc hồ sơ cá
 * nhân còn thiếu mục bắt buộc, thì hiện một hộp thông báo giữa màn hình trên trang vừa vào — bấm
 * từng dòng là mở thẳng checklist / trang hồ sơ. Sang hồ sơ khi còn checklist chưa điền thì nhắc
 * lại checklist sau khi lưu hồ sơ (hoặc khi rời trang hồ sơ). Gắn trong AppShell.
 */
export function ChecklistLoginReminder() {
  const pending = useChecklistReminderStore((s) => s.pending)
  const scope = useChecklistReminderStore((s) => s.scope)
  const deferred = useChecklistReminderStore((s) => s.deferred)
  const clear = useChecklistReminderStore((s) => s.clear)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Tài khoản admin dùng chung không tự điền / không phụ trách ai / không có hồ sơ nhân sự.
  const isStaff = user != null && !user.isAdminAccount
  const role = user?.role
  const enabled = pending && isStaff
  const withProfile = scope === 'all'
  const mine = useMyChecklists(enabled)
  const leader = useLeaderChecklistEmployees(enabled)
  const profile = useMeUserSelf(enabled && withProfile)
  const [reminder, setReminder] = useState<LoginReminder | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  // Query bị tắt vẫn ở trạng thái pending — chỉ chờ hồ sơ khi có nhắc hồ sơ.
  const loading = mine.isPending || leader.isPending || (withProfile && profile.isPending)
  useEffect(() => {
    if (!pending) return
    if (!isStaff) {
      clear()
      return
    }
    if (loading) return
    clear()
    setReminder(
      loginReminder(
        pendingChecklists(mine.data, leader.data),
        withProfile ? missingProfileFields(profile.data, role) : []
      )
    )
  }, [pending, isStaff, role, loading, withProfile, mine.data, leader.data, profile.data, clear])

  // Đã hoãn nhắc checklist: vào được /profile thì chờ; rời /profile mà chưa lưu thì nhắc lại luôn.
  useEffect(() => {
    const store = useChecklistReminderStore.getState()
    if (deferred === 'going' && pathname === '/profile') store.markOnProfile()
    else if (deferred === 'onProfile' && pathname !== '/profile') store.resumeChecklists()
  }, [deferred, pathname])

  // Đăng xuất khi hộp còn mở thì đóng luôn, bỏ cả lần nhắc đang hoãn.
  useEffect(() => {
    if (user) return
    setReminder(null)
    useChecklistReminderStore.getState().reset()
  }, [user])

  if (!reminder) return null
  const copy = loginReminderCopy(reminder)
  const checklists = reminder.checklists
  const profileOnly = !checklists
  const go = (target: LoginReminderTarget) => {
    setReminder(null)
    if (target.to === '/checklists') {
      void navigate({ to: '/checklists', search: target.search })
      return
    }
    if (checklists) useChecklistReminderStore.getState().deferChecklists()
    void navigate({ to: '/profile' })
  }
  const HeaderIcon = profileOnly ? UserRoundPen : ClipboardList

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
        <div className="flex flex-col items-center px-6 pb-5 pt-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-warning-muted text-warning ring-8 ring-warning-muted/40">
            <HeaderIcon className="size-8" strokeWidth={1.75} aria-hidden />
          </span>
          <DialogTitle className="mt-5 text-xl font-bold">{copy.title}</DialogTitle>
          <DialogDescription className="mt-2 max-w-sm leading-relaxed">
            {copy.description}
          </DialogDescription>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto px-6">
          {checklists?.self.map((item) => (
            <ReminderRow
              key={item.id}
              icon={<CircleDashed className="size-[18px]" aria-hidden />}
              title={item.title}
              meta={`${item.questionCount} câu hỏi`}
              onClick={() =>
                go({ to: '/checklists', search: { tab: 'mine', templateId: item.id } })
              }
            />
          ))}
          {checklists && checklists.leaderEmployeeCount > 0 ? (
            <ReminderRow
              icon={<Users className="size-[18px]" aria-hidden />}
              title="Nhân sự bạn phụ trách"
              meta={`${checklists.leaderEmployeeCount} nhân sự`}
              onClick={() => go({ to: '/checklists', search: { tab: 'leader' } })}
            />
          ) : null}
          {reminder.profileMissing.length > 0 ? (
            <ReminderRow
              icon={<UserRound className="size-[18px]" aria-hidden />}
              title="Hồ sơ cá nhân"
              meta={`Thiếu ${summarizeMissingFields(reminder.profileMissing)}`}
              status="Chưa đủ"
              onClick={() => go({ to: '/profile' })}
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
            {copy.primaryLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
