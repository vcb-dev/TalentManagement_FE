import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useHrOrgTree } from '@/features/hr-admin/useHrOrgTree'
import { foldSearch } from '../checklistAnswers'
import { SquareCheckbox } from './SquareCheckbox'

type TeamOption = { id: string; name: string }
type TeamGroup = { id: string; name: string; teams: TeamOption[] }

/**
 * Chọn team áp dụng mẫu, nhóm theo phòng ban. `knownTeams` = team đã gán sẵn (có thể đã ngừng
 * hoạt động nên không còn trong cây tổ chức) — vẫn hiện để bỏ chọn được.
 */
export function ChecklistTeamPicker({
  value,
  onChange,
  knownTeams = [],
  disabled,
}: {
  value: string[]
  onChange: (teamIds: string[]) => void
  knownTeams?: TeamOption[]
  disabled?: boolean
}) {
  const { data, isLoading } = useHrOrgTree()
  const [q, setQ] = useState('')

  const groups = useMemo<TeamGroup[]>(() => {
    const out: TeamGroup[] = (data?.departments ?? [])
      .filter((d) => d.teams.length > 0)
      .map((d) => ({
        id: d.id,
        name: d.name,
        teams: d.teams.map((t) => ({ id: t.id, name: t.name })),
      }))
    const inTree = new Set(out.flatMap((g) => g.teams.map((t) => t.id)))
    const orphans = knownTeams.filter((t) => !inTree.has(t.id))
    if (orphans.length > 0) out.push({ id: '__other', name: 'Team khác', teams: orphans })
    return out
  }, [data, knownTeams])

  const nameById = useMemo(
    () => new Map(groups.flatMap((g) => g.teams.map((t) => [t.id, t.name] as const))),
    [groups]
  )

  const needle = foldSearch(q.trim())
  const visible = groups
    .map((g) =>
      needle && foldSearch(g.name).includes(needle)
        ? g
        : { ...g, teams: g.teams.filter((t) => foldSearch(t.name).includes(needle)) }
    )
    .filter((g) => g.teams.length > 0)

  const selected = new Set(value)
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((v) => v !== id))
  const toggleGroup = (g: TeamGroup, on: boolean) => {
    const ids = g.teams.map((t) => t.id)
    onChange(on ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-button/10 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              {nameById.get(id) ?? 'Team'}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-button/20 hover:text-foreground disabled:pointer-events-none"
                onClick={() => toggle(id, false)}
                disabled={disabled}
                aria-label={`Bỏ ${nameById.get(id) ?? 'team'}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs font-medium text-warning">
          Chưa chọn team nào — chưa ai thấy checklist này.
        </p>
      )}

      <div className="rounded-xl border border-border/80">
        <div className="relative border-b border-border/70 p-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm phòng ban / team…"
            className="h-9 border-0 pl-8 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto p-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách team…</p>
          ) : null}
          {!isLoading && visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có team khớp.</p>
          ) : null}
          {visible.map((g) => {
            const allOn = g.teams.every((t) => selected.has(t.id))
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {g.name}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-button hover:underline disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => toggleGroup(g, !allOn)}
                    disabled={disabled}
                  >
                    {allOn ? 'Bỏ chọn cả nhóm' : 'Chọn cả nhóm'}
                  </button>
                </div>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {g.teams.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <SquareCheckbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(c) => toggle(t.id, c === true)}
                        disabled={disabled}
                      />
                      <span className="truncate">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
