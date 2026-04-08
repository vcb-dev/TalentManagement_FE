import { getPermissionNode, PERMISSION_NODES } from './catalog'

function collectDescendantFunctionAndToggleIds(moduleId: string): string[] {
  const acc: string[] = []
  const walk = (pid: string) => {
    for (const n of PERMISSION_NODES) {
      if (n.parentId !== pid) continue
      if (n.kind === 'function' || n.kind === 'data_toggle') acc.push(n.id)
      if (n.kind === 'module') walk(n.id)
    }
  }
  walk(moduleId)
  return acc
}

function pickViewIdForModule(descendantIds: string[]): string | undefined {
  return descendantIds.find((id) => {
    if (id.endsWith('.view')) return true
    const n = getPermissionNode(id)
    return n?.label.toLowerCase().startsWith('xem ')
  })
}

/**
 * Nếu bất kỳ quyền chức năng / toggle nào trong module được bật,
 * đảm bảo quyền "Xem" tương ứng của module được bật (bám ảnh ERP).
 */
export function applyMandatoryViewRules(selected: Set<string>): Set<string> {
  const next = new Set(selected)
  const moduleRoots = PERMISSION_NODES.filter((n) => n.kind === 'module' && n.parentId === null)
  for (const mod of moduleRoots) {
    const stack = collectDescendantFunctionAndToggleIds(mod.id)
    if (stack.length === 0) continue
    const viewId = pickViewIdForModule(stack)
    if (!viewId) continue
    const anySelected = stack.some((id) => next.has(id))
    const anyNonView = stack.some((id) => id !== viewId && next.has(id))
    if (anySelected && anyNonView) next.add(viewId)
    if (anySelected && !anyNonView && next.has(viewId)) {
      /* chỉ có view — ok */
    }
  }
  return next
}

export function mergePermissionIds(ids: Iterable<string>): Set<string> {
  return new Set(ids)
}

/** Union từ nhiều template + chỉnh tay, rồi áp rule view. */
export function computeEffectivePermissionIds(
  templateIds: string[],
  templateResolver: (id: string) => readonly string[] | undefined,
  manualIds: Iterable<string>
): string[] {
  const acc = new Set<string>()
  for (const tid of templateIds) {
    const p = templateResolver(tid)
    if (p) for (const x of p) acc.add(x)
  }
  for (const m of manualIds) acc.add(m)
  return [...applyMandatoryViewRules(acc)]
}
