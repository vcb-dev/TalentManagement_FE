import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  type Control,
  type FieldValues,
  type Path,
  useFormContext,
  useWatch,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type OrgSelectOption = { value: string; label: string }

export interface EmployeeExtraTeamsFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  primaryTeamId: string
  allTeams: OrgSelectOption[]
  disabled?: boolean
  label?: string
  description?: string
  className?: string
}

export function EmployeeExtraTeamsField<T extends FieldValues>({
  control,
  name,
  primaryTeamId,
  allTeams,
  disabled,
  label = 'Nhóm bổ sung',
  description = 'Có thể thêm nhiều nhóm khác (ngoài nhóm theo phòng ban).',
  className,
}: EmployeeExtraTeamsFieldProps<T>) {
  const { setValue } = useFormContext<T>()
  const extraTeamIds = (useWatch({ control, name }) as string[] | undefined) ?? []
  const [pickId, setPickId] = useState('')

  const teamLabelById = useMemo(() => new Map(allTeams.map((t) => [t.value, t.label])), [allTeams])

  const availableTeams = useMemo(
    () => allTeams.filter((t) => t.value !== primaryTeamId && !extraTeamIds.includes(t.value)),
    [allTeams, extraTeamIds, primaryTeamId]
  )

  const addTeam = () => {
    const id = pickId.trim()
    if (!id || disabled) return
    if (id === primaryTeamId || extraTeamIds.includes(id)) return
    setValue(name, [...extraTeamIds, id] as T[Path<T>], {
      shouldDirty: true,
      shouldTouch: true,
    })
    setPickId('')
  }

  const removeTeam = (teamId: string) => {
    if (disabled) return
    setValue(name, extraTeamIds.filter((id) => id !== teamId) as T[Path<T>], {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>

      {extraTeamIds.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {extraTeamIds.map((teamId) => (
            <li
              key={teamId}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
            >
              <span>{teamLabelById.get(teamId) ?? teamId}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="rounded-full p-0.5 text-sky-700 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900"
                  aria-label={`Gỡ ${teamLabelById.get(teamId) ?? teamId}`}
                  onClick={() => removeTeam(teamId)}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Chưa có nhóm bổ sung.</p>
      )}

      {!disabled && availableTeams.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Select value={pickId || undefined} onValueChange={setPickId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Chọn nhóm để thêm" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!pickId}
            onClick={addTeam}
          >
            <Plus className="h-4 w-4" />
            Thêm nhóm
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function extraTeamIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}
