import { useContext, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Building2, FolderKanban, UserRound, Users, type LucideIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { ChecklistSubjectInfo } from '../types'
import { ChecklistFormDirtyContext } from './ChecklistForm'

/**
 * Link sang Hồ sơ cá nhân, cùng tab (phiên đăng nhập lưu theo tab — tab mới sẽ bị đăng xuất).
 * Đang điền dở (có câu trả lời chưa lưu) thì hỏi lại trước khi rời form.
 */
export function ChecklistProfileLink({ children }: { children: ReactNode }) {
  const dirty = useContext(ChecklistFormDirtyContext)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <Link
        to="/profile"
        className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        onClick={(e) => {
          if (!dirty) return
          e.preventDefault()
          setConfirming(true)
        }}
      >
        {children}
      </Link>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Rời checklist đang điền?"
        description="Các câu trả lời chưa bấm “Lưu checklist” sẽ bị mất. Bạn có thể lưu trước, rồi cập nhật hồ sơ sau."
        confirmLabel="Sang Hồ sơ cá nhân"
        cancelLabel="Ở lại điền tiếp"
        onConfirm={() => {
          setConfirming(false)
          void navigate({ to: '/profile' })
        }}
      />
    </>
  )
}

type InfoItem = { label: string; icon: LucideIcon; value: string | null }

function joined(list: string[]): string | null {
  return list.length > 0 ? list.join(', ') : null
}

export function checklistSubjectInfoItems(info: ChecklistSubjectInfo): InfoItem[] {
  return [
    { label: 'Phòng ban', icon: Building2, value: info.departmentName },
    { label: 'Nhóm', icon: Users, value: joined(info.teamNames) },
    { label: 'Dự án tham gia', icon: FolderKanban, value: joined(info.projectNames) },
    { label: 'Trưởng nhóm phụ trách', icon: UserRound, value: info.teamLeaderName },
  ]
}

const PLACEHOLDER_INFO: ChecklistSubjectInfo = {
  departmentName: null,
  teamNames: [],
  projectNames: [],
  teamLeaderName: null,
}

/**
 * Phòng ban / nhóm / dự án / trưởng nhóm của người được đánh giá — luôn hiện trên đầu form
 * checklist, không phải câu hỏi. `info = null` (xem trước mẫu): chưa có người cụ thể.
 */
export function ChecklistSubjectInfoGrid({
  info,
  footer,
}: {
  info: ChecklistSubjectInfo | null
  footer?: ReactNode
}) {
  const placeholder = info === null
  const items = checklistSubjectInfoItems(info ?? PLACEHOLDER_INFO)
  return (
    <div className="space-y-3 rounded-xl bg-muted/40 px-4 py-3">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {items.map(({ label, icon: Icon, value }) => (
          <div key={label} className="flex min-w-0 items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd
                className={cn(
                  'break-words text-sm',
                  value ? 'font-medium text-foreground' : 'italic text-muted-foreground'
                )}
              >
                {value ?? (placeholder ? 'Lấy từ hồ sơ nhân sự' : 'Chưa cập nhật')}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      {footer || placeholder ? (
        <p className="text-xs text-muted-foreground">
          {footer ?? 'Tự hiện trên đầu form theo hồ sơ của từng nhân sự — không cần thêm câu hỏi.'}
        </p>
      ) : null}
    </div>
  )
}
