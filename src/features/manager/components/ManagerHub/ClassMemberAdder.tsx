import { useState } from 'react'
import { Loader2, Search, UserPlus2 } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAddClassMember, useClassMemberOptions } from '@/features/manager/hooks'
import type { ManagerClass } from '@/features/manager/types'
import { useDebounce } from '@/hooks/useDebounce'

const DEFAULT_CAPACITY = 25

/**
 * Ô tìm & thêm học viên thẳng vào lớp — chỉ admin (`class.members.manage`).
 * Kết quả hiện ngay trong thẻ (đẩy nội dung xuống) thay vì nổi lên, để không che thẻ lớp bên dưới.
 */
export function ClassMemberAdder({ row }: { row: ManagerClass }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const debounced = useDebounce(trimmed, 300)
  const addMember = useAddClassMember()
  const { data: options = [], isFetching } = useClassMemberOptions(
    debounced,
    undefined,
    row.teacher?.userId
  )

  const capacity = row.capacity ?? DEFAULT_CAPACITY
  if (row.memberCount >= capacity) {
    return (
      <p className="mt-2 rounded-lg bg-warning-muted px-3 py-2 text-xs font-medium text-warning">
        Lớp đã đủ {capacity} học viên — xoá bớt học viên để thêm người khác.
      </p>
    )
  }

  const joined = new Set(row.members.map((m) => m.userId))
  const results = options.filter((o) => !joined.has(o.userId))
  const searching = trimmed !== debounced || isFetching
  const pendingUserId = addMember.isPending ? addMember.variables?.userId : undefined
  const inputId = `class-member-add-${row.id}`

  return (
    <div className="mt-2 border-t border-border/60 pt-3">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        Thêm học viên
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gõ tên hoặc email nhân sự…"
          autoComplete="off"
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>
      {trimmed ? (
        <div className="mt-1.5" aria-live="polite">
          {searching && results.length === 0 ? (
            <p className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Đang tìm…
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Không tìm thấy nhân sự phù hợp (hoặc đã ở trong lớp).
            </p>
          ) : (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {results.map((opt) => {
                const isAdding = pendingUserId === opt.userId
                return (
                  <li
                    key={opt.userId}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                  >
                    <EmployeeAvatar
                      name={opt.name}
                      className="size-7 shadow-none ring-0"
                      fallbackClassName="bg-muted text-muted-foreground"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{opt.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{opt.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-button hover:bg-button/10 hover:text-button"
                      disabled={addMember.isPending}
                      aria-label={`Thêm ${opt.name} vào lớp`}
                      onClick={() =>
                        addMember.mutate(
                          { classId: row.id, userId: opt.userId },
                          { onSuccess: () => setQuery('') }
                        )
                      }
                    >
                      {isAdding ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <UserPlus2 className="size-3.5" aria-hidden />
                      )}
                      Thêm
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
