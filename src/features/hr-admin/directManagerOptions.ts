import type { EmployeeEntity } from '@/features/hr-admin/api'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import type { Role } from '@/types/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

export type DirectManagerOption = { value: string; label: string; name: string; role: Role }

const DIRECT_MANAGER_ROLES = new Set<Role>(['MANAGER', 'BOD'])

export function isDirectManagerRole(role: Role): boolean {
  return DIRECT_MANAGER_ROLES.has(role)
}

/** Chỉ giữ MANAGER / BOD (và tuỳ chọn legacy). */
export function filterDirectManagerCandidates(
  managers: EmployeeEntity[],
  employeeId: string
): EmployeeEntity[] {
  return managers.filter((m) => m.id !== employeeId && isDirectManagerRole(m.role))
}

/** Map giá trị DB (tên hoặc UUID cũ) → id user cho select. */
export function resolveDirectManagerFormValue(
  stored: string | null | undefined,
  managers: Pick<EmployeeEntity, 'id' | 'name'>[]
): string {
  const raw = stored?.trim() ?? ''
  if (!raw) return '__none'
  if (isUuid(raw) && managers.some((m) => m.id === raw)) return raw
  const byName = managers.find(
    (m) => m.name.trim().toLowerCase() === raw.toLowerCase() || m.name.trim() === raw
  )
  return byName?.id ?? raw
}

export function buildDirectManagerSelectOptions(
  managers: EmployeeEntity[],
  employeeId: string,
  stored: string | null | undefined
): DirectManagerOption[] {
  const options: DirectManagerOption[] = filterDirectManagerCandidates(managers, employeeId)
    .map((m) => ({
      value: m.id,
      name: m.name,
      role: m.role,
      label: `${m.name} (${ROLE_LABEL_VI[m.role]})`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  const raw = stored?.trim() ?? ''
  if (!raw) return options

  const resolved = resolveDirectManagerFormValue(raw, managers)
  if (!resolved || options.some((o) => o.value === resolved)) return options

  options.unshift({
    value: resolved,
    name: raw,
    role: 'MANAGER',
    label: isUuid(resolved)
      ? `${raw || 'Quản lý cũ'} (không còn trong danh sách)`
      : `${raw} (dữ liệu cũ)`,
  })
  return options
}

/** Chuyển id đã chọn trên form → tên lưu DB (cột direct_manager). */
export function directManagerIdToStoredName(
  formValue: string,
  managers: Pick<EmployeeEntity, 'id' | 'name'>[]
): string | null {
  const id = formValue.trim()
  if (!id || id === '__none') return null
  const match = managers.find((m) => m.id === id)
  if (match) return match.name.trim() || null
  if (isUuid(id)) return null
  return id
}
