import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import {
  countFunctionsUnderModule,
  getChildNodeIds,
  getModuleRootIds,
  getPermissionNode,
  PERMISSION_NODES,
} from '@/features/permissions/catalog'
import { applyMandatoryViewRules } from '@/features/permissions/effectivePermissions'
import { cn } from '@/lib/utils'

export interface PermissionTreeProps {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  expanded: Set<string>
  onExpandedChange: (next: Set<string>) => void
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

export function PermissionTree({
  selected,
  onChange,
  expanded,
  onExpandedChange,
}: PermissionTreeProps) {
  const moduleIds = useMemo(() => getModuleRootIds(), [])

  const toggleExpand = (id: string) => {
    const n = new Set(expanded)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    onExpandedChange(n)
  }

  const setModuleAll = (moduleId: string, checked: boolean) => {
    const { leaves } = countFunctionsUnderModule(moduleId)
    const next = new Set(selected)
    if (checked) for (const id of leaves) next.add(id)
    else for (const id of leaves) next.delete(id)
    onChange(applyMandatoryViewRules(next))
  }

  const toggleLeaf = (id: string, disabled?: boolean) => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(applyMandatoryViewRules(next))
  }

  const expandAll = () => onExpandedChange(new Set(moduleIds))
  const collapseAll = () => onExpandedChange(new Set())

  const selectAllLeaves = () => {
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
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline"
          onClick={selectAllLeaves}
        >
          Chọn tất cả
        </button>
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline"
          onClick={expandAll}
        >
          Mở tất cả
        </button>
        <button
          type="button"
          className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          onClick={collapseAll}
        >
          Thu gọn tất cả
        </button>
      </div>

      <div className="space-y-2.5">
        {moduleIds.map((modId) => {
          const mod = PERMISSION_NODES.find((n) => n.id === modId)
          if (!mod) return null
          const isOpen = expanded.has(modId)
          const { total, leaves } = countFunctionsUnderModule(modId)
          const selCount = leaves.filter((id) => selected.has(id)).length
          const ts = triState(modId, selected)
          const childIds = getChildNodeIds(modId)

          return (
            <div
              key={modId}
              className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 md:px-4">
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => toggleExpand(modId)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                    checked={ts === 'checked'}
                    ref={(el) => {
                      if (el) el.indeterminate = ts === 'indeterminate'
                    }}
                    onChange={(e) => setModuleAll(modId, e.target.checked)}
                  />
                  <span className="min-w-0 font-semibold text-foreground">{mod.label}</span>
                  <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                    {selCount}/{total}
                  </span>
                </label>
              </div>

              {isOpen ? (
                <ul className="space-y-1.5 px-3 py-3 pl-10 md:px-4 md:pl-12">
                  {childIds.map((cid) => {
                    const node = PERMISSION_NODES.find((n) => n.id === cid)
                    if (!node || node.kind === 'module') return null
                    const isToggle = node.kind === 'data_toggle'
                    const isViewNode = (id: string) => {
                      const nn = getPermissionNode(id)
                      return (
                        nn?.kind === 'function' &&
                        (id.endsWith('.view') || nn.label.toLowerCase().startsWith('xem '))
                      )
                    }
                    const disabled = isToggle
                      ? false
                      : isViewNode(cid) &&
                        leaves.some(
                          (lid) =>
                            lid !== cid &&
                            selected.has(lid) &&
                            !isViewNode(lid) &&
                            getPermissionNode(lid)?.kind !== 'data_toggle'
                        )

                    if (isToggle) {
                      return (
                        <li
                          key={cid}
                          className="flex items-start gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2.5"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                            checked={selected.has(cid)}
                            onChange={() => toggleLeaf(cid, false)}
                          />
                          <div>
                            <div className="text-sm font-medium text-foreground">{node.label}</div>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              Giới hạn phạm vi dữ liệu (ABAC) — backend áp dụng khi có truy vấn lọc
                              theo người phụ trách.
                            </p>
                          </div>
                        </li>
                      )
                    }

                    return (
                      <li key={cid} className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
                          checked={selected.has(cid)}
                          disabled={disabled}
                          onChange={() => toggleLeaf(cid, !!disabled)}
                        />
                        <span
                          className={cn(
                            'text-sm',
                            disabled ? 'text-muted-foreground' : 'text-foreground'
                          )}
                        >
                          {node.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
