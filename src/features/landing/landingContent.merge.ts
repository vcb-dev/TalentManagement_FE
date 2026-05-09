import type { CompanyLandingContent } from './landingContent.types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function mergeDeepReplaceArrays(base: unknown, patch: unknown): unknown {
  if (patch === undefined || patch === null) return base
  if (Array.isArray(patch)) return patch
  if (!isPlainObject(patch) || !isPlainObject(base)) return patch
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    const pv = patch[key]
    const bv = out[key]
    if (pv === undefined) continue
    if (Array.isArray(pv)) {
      out[key] = pv
    } else if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = mergeDeepReplaceArrays(bv, pv)
    } else {
      out[key] = pv
    }
  }
  return out
}

/** Merge defaults với patch từ server (object lồng nhau; mảng: server thay cả mảng nếu có key). */
export function mergeCompanyLandingContent(
  defaults: CompanyLandingContent,
  patch: Partial<CompanyLandingContent> | Record<string, unknown> | null | undefined
): CompanyLandingContent {
  if (!patch) return structuredClone(defaults)
  return mergeDeepReplaceArrays(defaults, patch) as CompanyLandingContent
}
