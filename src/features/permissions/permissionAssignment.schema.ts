import { z } from 'zod'

/** BE có thể trả `null` JSON / thiếu key; chuẩn hoá trước khi validate record. */
function asStringArray(v: unknown): string[] {
  if (v === null || v === undefined) return []
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function asBooleanRecord(v: unknown): Record<string, boolean> {
  if (v === null || v === undefined) return {}
  if (typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, boolean> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[k] = val
  }
  return out
}

/** Khớp BE `PermissionAssignmentRecord` / PUT body (dung sai dữ liệu legacy). */
export const permissionAssignmentRecordSchema = z.object({
  userId: z.string().uuid(),
  scopeKey: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.literal('global')),
  roleTemplateIds: z.preprocess(asStringArray, z.array(z.string())),
  grantedPermissionIds: z.preprocess(asStringArray, z.array(z.string())),
  dataScopeFlags: z.preprocess(asBooleanRecord, z.record(z.string(), z.boolean())),
})

export type PermissionAssignmentRecordParsed = z.infer<typeof permissionAssignmentRecordSchema>
