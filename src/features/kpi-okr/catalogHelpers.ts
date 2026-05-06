/**
 * Helpers cho Epic 9 — KPI Catalog trên FE.
 * Đồng bộ với BE sales-scope.ts.
 */

/** Label hiển thị cho category */
export function categoryLabel(category: string | null | undefined): string {
  switch (category) {
    case 'BASE':
      return 'A. Lương cơ bản'
    case 'KPI_BONUS':
      return 'B. KPI thưởng'
    case 'PERFORMANCE_BONUS':
      return 'D. Thưởng hiệu suất'
    case 'BENEFIT':
      return 'E. Phúc lợi'
    default:
      return category || '—'
  }
}

/** Badge class cho category */
export function categoryBadgeClass(category: string | null | undefined): string {
  switch (category) {
    case 'BASE':
      return 'border-slate-200 bg-slate-50 text-slate-600'
    case 'KPI_BONUS':
      return 'border-indigo-200 bg-indigo-50 text-indigo-600'
    case 'PERFORMANCE_BONUS':
      return 'border-emerald-200 bg-emerald-50 text-emerald-600'
    case 'BENEFIT':
      return 'border-amber-200 bg-amber-50 text-amber-600'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-500'
  }
}

/**
 * Mapping team → templateCode (đồng bộ BE resolveTemplateCodeForTeam).
 */
export function resolveTemplateCodeForTeam(team: { code?: string | null; name: string }): string {
  const key = (team.code ?? team.name ?? '').toLowerCase()
  if (/livestream|live\b/.test(key)) return 'LIVESTREAM_NV'
  if (/vận[_\s]?đơn|van[._\s-]?don|bảo[_\s]?hành/i.test(key)) return 'VAN_DON_NV'
  return 'SALES_NV'
}

/** Danh sách division IDs được allowlist catalog (dùng VITE_CATALOG_ENABLED_DIVISION_IDS). */
export function getCatalogEnabledDivisionIds(): string[] {
  const raw = import.meta.env.VITE_CATALOG_ENABLED_DIVISION_IDS as string | undefined
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Các pattern fallback nhận diện division qua tên/code. */
const CATALOG_DIVISION_PATTERNS = [/kinh[_\s]?doanh/i, /vận[_\s]?đơn|van[._\s-]?don|bảo[_\s]?hành/i]

/** Kiểm tra division có trong allowlist catalog không. */
export function isCatalogEnabledDepartment(
  division?: {
    id?: string
    name?: string | null
    code?: string | null
  } | null
): boolean {
  if (!division) return false
  const ids = getCatalogEnabledDivisionIds()
  if (division.id && ids.includes(division.id)) return true
  const label = division.code ?? division.name ?? ''
  return CATALOG_DIVISION_PATTERNS.some((p) => p.test(label))
}

/** Danh sách category theo thứ tự hiển thị. */
export const CATEGORY_ORDER = ['BASE', 'KPI_BONUS', 'PERFORMANCE_BONUS', 'BENEFIT'] as const

/**
 * Group assignments theo category và sắp xếp theo thứ tự hiển thị.
 * Trả null nếu không có assignment nào có category (phòng không thuộc catalog).
 */
export function groupByCategory(
  assignments: PerformanceAssignment[]
): Map<string, PerformanceAssignment[]> | null {
  const hasCategory = assignments.some((a) => a.category != null)
  if (!hasCategory) return null

  const map = new Map<string, PerformanceAssignment[]>()
  for (const cat of CATEGORY_ORDER) {
    const items = assignments.filter((a) => a.category === cat)
    if (items.length > 0) map.set(cat, items)
  }
  return map
}

import type { PerformanceAssignment } from '@/features/kpi-okr/api'
