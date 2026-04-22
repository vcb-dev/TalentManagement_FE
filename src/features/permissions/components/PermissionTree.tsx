import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  countFunctionsUnderModule,
  getModuleRootIdsInUiOrder,
  getModuleUiScreens,
  PERMISSION_NODES,
} from '@/features/permissions/catalog'
import { applyMandatoryViewRules } from '@/features/permissions/effectivePermissions'
import { useMemo } from 'react'

export interface PermissionTreeProps {
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

function triState(
  moduleId: string,
  selected: Set<string>
): 'checked' | 'unchecked' | 'indeterminate' {
  const { leaves } = countFunctionsUnderModule(moduleId)
  if (leaves.length === 0) return 'unchecked'
  const n = leaves.filter((id) => selected.has(id)).length
  if (n === 0) return 'unchecked'
  if (n === leaves.length) return 'checked'
  return 'indeterminate'
}

export function PermissionTree({ selected, onChange }: PermissionTreeProps) {
  const moduleIds = useMemo(() => getModuleRootIdsInUiOrder(), [])

  const setModuleAll = (moduleId: string, checked: boolean) => {
    const { leaves } = countFunctionsUnderModule(moduleId)
    const next = new Set(selected)
    if (checked) for (const id of leaves) next.add(id)
    else for (const id of leaves) next.delete(id)
    onChange(applyMandatoryViewRules(next))
  }

  const selectAllModules = () => {
    const next = new Set(selected)
    for (const m of moduleIds) {
      const { leaves } = countFunctionsUnderModule(m)
      for (const id of leaves) next.add(id)
    }
    onChange(applyMandatoryViewRules(next))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 font-medium text-primary underline-offset-4 hover:bg-transparent hover:text-primary/90 hover:underline"
          onClick={selectAllModules}
        >
          Chọn tất cả
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Tích mỗi khối là bật toàn bộ thao tác trong khu vực đó. Dưới tên khối là danh sách màn/đường
        dẫn chính mà quyền mở được (để cấp quyền dễ hiểu).
      </p>

      <div className="space-y-2.5">
        {moduleIds.map((modId) => {
          const mod = PERMISSION_NODES.find((n) => n.id === modId)
          if (!mod) return null
          const { total, leaves } = countFunctionsUnderModule(modId)
          const selCount = leaves.filter((id) => selected.has(id)).length
          const ts = triState(modId, selected)

          const screens = getModuleUiScreens(modId)

          return (
            <div
              key={modId}
              className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-2.5 px-3 py-2.5 md:px-4">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <Checkbox
                    className="mt-0.5"
                    checked={
                      ts === 'checked' ? true : ts === 'indeterminate' ? 'indeterminate' : false
                    }
                    onCheckedChange={(v) => {
                      setModuleAll(modId, v === true)
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="min-w-0 font-semibold text-foreground">{mod.label}</span>
                      <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                        {selCount}/{total}
                      </span>
                    </div>
                    {screens.length > 0 ? (
                      <ul className="list-inside list-disc space-y-0.5 pl-0.5 text-xs leading-relaxed text-muted-foreground">
                        {screens.map((line) => (
                          <li key={line} className="pl-0.5 break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
