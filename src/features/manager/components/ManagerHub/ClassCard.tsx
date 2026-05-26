import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2, UserPlus2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useAddClassMember,
  useClassMemberOptions,
  useRemoveClassMember,
} from '@/features/manager/hooks'

const STATUS_LABEL: Record<'open' | 'full' | 'closed', { label: string; className: string }> = {
  open: { label: 'Đang mở', className: 'bg-white/20 text-white backdrop-blur-md' },
  full: { label: 'Đủ chỗ', className: 'bg-white/20 text-white backdrop-blur-md' },
  closed: { label: 'Đã đóng', className: 'bg-white/15 text-white/90' },
}

const HEADER_GRADIENT: Record<'open' | 'full' | 'closed', string> = {
  open: 'from-primary via-primary-600 to-primary-700',
  full: 'from-amber-500 to-orange-600',
  closed: 'from-gray-500 to-gray-700',
}

const LEVEL_LABELS: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

const DOT_PATTERN = 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.35) 1px, transparent 0)'

function toViDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

interface ClassCardProps {
  row: any
  onEdit: (row: any) => void
  onDelete: (id: string) => void
}

export function ClassCard({ row, onEdit, onDelete }: ClassCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isExpandedMembers, setIsExpandedMembers] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const addMember = useAddClassMember()
  const removeMember = useRemoveClassMember()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: memberOptions = [], isFetching: fetchingMemberOptions } = useClassMemberOptions(
    debouncedQuery,
    undefined,
    row.teacher?.userId
  )

  const filteredOptions = useMemo(() => {
    const joined = new Set((row.members ?? []).map((m: any) => m.userId))
    return memberOptions.filter((o) => !joined.has(o.userId) && o.userId !== row.teacher?.userId)
  }, [row.members, row.teacher, memberOptions])

  const st = STATUS_LABEL[row.status as 'open' | 'full' | 'closed'] || STATUS_LABEL.open
  const header = HEADER_GRADIENT[row.status as 'open' | 'full' | 'closed'] || HEADER_GRADIENT.open

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-xl',
        showDropdown ? 'relative z-30' : 'relative z-0'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-gradient-to-r transition-all duration-300 cursor-pointer select-none',
          header,
          isCollapsed ? 'h-14 rounded-2xl' : 'h-24 rounded-t-2xl'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: DOT_PATTERN, backgroundSize: '20px 20px' }}
        />
        <div
          className={cn(
            'relative z-10 flex items-center justify-between px-6',
            isCollapsed ? 'h-full' : 'pt-6'
          )}
        >
          <div className="flex flex-col">
            {!isCollapsed && (
              <span
                className={cn(
                  'mb-1 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider',
                  st.className
                )}
              >
                {st.label}
              </span>
            )}
            <h3
              className={cn(
                'font-bold leading-tight text-white transition-all',
                isCollapsed ? 'text-base' : 'text-lg'
              )}
            >
              {row.name}
              {isCollapsed && (
                <span className="ml-3 text-xs opacity-80 font-normal">
                  ({row.memberCount} thành viên)
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isCollapsed && (
              <span
                className={cn('rounded-full px-2 py-0.5 text-xs font-bold uppercase', st.className)}
              >
                {st.label}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed(!isCollapsed)
              }}
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-6 transition-all duration-300">
          <div className="mb-6 flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground">
              {row.memberCount} thành viên
            </span>
          </div>

          <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-extrabold text-foreground">
              {LEVEL_LABELS[row.levelFrom]} → {LEVEL_LABELS[row.levelTo]}
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              Kỳ thi dự kiến: {toViDate(row.examDate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Giáo viên:{' '}
              <span className="font-semibold text-foreground">
                {row.teacher?.name || 'Chưa gán'}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            {(() => {
              const allMembers = row.members ?? []
              const displayMembers = isExpandedMembers ? allMembers : allMembers.slice(0, 5)
              return (
                <>
                  {displayMembers.map((m: any) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between rounded-md border bg-white px-2 py-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{m.name}</p>
                        <p className="truncate text-muted-foreground">{m.email}</p>
                      </div>
                      {false ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => removeMember.mutate({ classId: row.id, userId: m.userId })}
                          title="Xóa khỏi lớp"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {allMembers.length > 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full py-1 text-xs font-bold text-primary hover:bg-primary/5"
                      onClick={() => setIsExpandedMembers(!isExpandedMembers)}
                    >
                      {isExpandedMembers
                        ? 'Thu gọn'
                        : `Xem thêm ${allMembers.length - 5} học viên...`}
                    </Button>
                  )}
                </>
              )
            })()}
          </div>

          {false ? (
            <div className="search-dropdown-container relative mt-3">
              <Input
                value={query}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowDropdown(true)
                }}
                placeholder="Gõ tên/email để thêm nhân sự..."
                className="h-auto w-full rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              {showDropdown && query.trim().length > 0 && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                  {fetchingMemberOptions ? (
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang tìm...
                    </div>
                  ) : filteredOptions.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      Không có kết quả phù hợp
                    </div>
                  ) : (
                    filteredOptions.map((opt) => (
                      <Button
                        key={opt.userId}
                        type="button"
                        variant="ghost"
                        className="flex h-auto w-full flex-col items-start rounded px-2 py-1.5 text-left text-xs font-normal hover:bg-primary/10"
                        onMouseDown={() => {
                          addMember.mutate({ classId: row.id, userId: opt.userId })
                          setQuery('')
                          setShowDropdown(false)
                        }}
                      >
                        <p className="font-semibold text-foreground">{opt.name}</p>
                        <p className="text-muted-foreground">{opt.email}</p>
                      </Button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
              Học viên tự đăng ký lớp; giáo viên sẽ duyệt hoặc từ chối đăng ký.
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-xl font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa lớp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-xl font-bold text-primary hover:bg-primary/5"
              onClick={() => onEdit(row)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
