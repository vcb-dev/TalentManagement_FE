import { useMemo, useState } from 'react'
import { Check, Loader2, Minus, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { foldSearch } from '@/features/checklist/checklistAnswers'
import { useTeamExamTeamOptions } from '@/features/manager/hooks'

type TeamOption = { id: string; name: string; memberCount: number | null }
type DepartmentGroup = { id: string; name: string; teams: TeamOption[] }

function CheckMark({ state }: { state: 'on' | 'off' | 'partial' }) {
  return (
    <span
      className={cn(
        // Bo nhỏ cố định: `rounded-md` theo --radius thành hình tròn, trông như nút radio.
        'flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        state === 'off' ? 'border-border bg-card' : 'border-button bg-button text-white'
      )}
      aria-hidden
    >
      {state === 'on' ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {state === 'partial' ? <Minus className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  )
}

/**
 * Chọn team (nhóm theo phòng ban, chọn được nhiều phòng ban) cho lịch thi theo team.
 * `knownTeams` = team đã gán sẵn nhưng nay không còn hoạt động — vẫn hiện để bỏ chọn được.
 */
export function ExamTeamPicker({
  value,
  onChange,
  knownTeams = [],
}: {
  value: string[]
  onChange: (teamIds: string[]) => void
  knownTeams?: { id: string; name: string }[]
}) {
  const { data, isLoading, isError } = useTeamExamTeamOptions(true)
  const [q, setQ] = useState('')

  const groups = useMemo<DepartmentGroup[]>(() => {
    const out: DepartmentGroup[] = (data?.departments ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      teams: d.teams,
    }))
    const inTree = new Set(out.flatMap((g) => g.teams.map((t) => t.id)))
    const orphans = knownTeams
      .filter((t) => !inTree.has(t.id))
      .map((t) => ({ ...t, memberCount: null }))
    if (orphans.length > 0)
      out.push({ id: '__other', name: 'Team ngừng hoạt động', teams: orphans })
    return out
  }, [data, knownTeams])

  const teamById = useMemo(
    () => new Map(groups.flatMap((g) => g.teams.map((t) => [t.id, t] as const))),
    [groups]
  )
  const selected = new Set(value)

  const needle = foldSearch(q.trim())
  const visible = groups
    .map((g) =>
      !needle || foldSearch(g.name).includes(needle)
        ? g
        : { ...g, teams: g.teams.filter((t) => foldSearch(t.name).includes(needle)) }
    )
    .filter((g) => g.teams.length > 0)

  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id])
  const toggleGroup = (g: DepartmentGroup) => {
    const ids = g.teams.map((t) => t.id)
    const allOn = ids.every((id) => selected.has(id))
    onChange(allOn ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])])
  }

  const selectedDepartments = groups.filter((g) => g.teams.some((t) => selected.has(t.id))).length
  const memberTotal = value.reduce((sum, id) => sum + (teamById.get(id)?.memberCount ?? 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-button" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-dashed border-danger/40 bg-danger-muted/40 px-4 py-3 text-sm text-danger">
        Không tải được danh sách team.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm phòng ban hoặc team..."
          aria-label="Tìm phòng ban hoặc team"
          className="h-9 w-full rounded-xl pl-9 pr-8 text-sm"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-button/10 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              {teamById.get(id)?.name ?? 'Team'}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-button/20 hover:text-foreground"
                onClick={() => toggle(id)}
                aria-label={`Bỏ ${teamById.get(id)?.name ?? 'team'}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {q ? `Không có phòng ban / team khớp với "${q}".` : 'Chưa có team nào đang hoạt động.'}
        </p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border bg-muted/20 p-2">
          {visible.map((g) => {
            const onCount = g.teams.filter((t) => selected.has(t.id)).length
            const state = onCount === 0 ? 'off' : onCount === g.teams.length ? 'on' : 'partial'
            return (
              <div key={g.id} className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-card has-focus-visible:ring-2 has-focus-visible:ring-button/35">
                  <input
                    type="checkbox"
                    checked={state === 'on'}
                    onChange={() => toggleGroup(g)}
                    aria-label={`Chọn cả phòng ban ${g.name}`}
                    className="sr-only"
                  />
                  <CheckMark state={state} />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {g.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {onCount}/{g.teams.length} team
                  </span>
                </label>
                <div className="grid gap-1 pl-5 sm:grid-cols-2">
                  {g.teams.map((t) => {
                    const checked = selected.has(t.id)
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-button/35',
                          checked
                            ? 'border-button/40 bg-card shadow-sm'
                            : 'border-transparent hover:bg-card'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(t.id)}
                          className="sr-only"
                        />
                        <CheckMark state={checked ? 'on' : 'off'} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {t.name}
                        </span>
                        {t.memberCount !== null ? (
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {t.memberCount} người
                          </span>
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length === 0 ? (
          'Chưa chọn team nào.'
        ) : (
          <>
            Đã chọn <span className="font-semibold text-foreground">{value.length} team</span> ở{' '}
            <span className="font-semibold text-foreground">{selectedDepartments} phòng ban</span> ·
            khoảng <span className="font-semibold tabular-nums text-foreground">{memberTotal}</span>{' '}
            nhân sự (tính cả team phụ). Người vào team sau vẫn thấy lịch nếu kỳ thi chưa diễn ra.
          </>
        )}
      </p>
    </div>
  )
}
