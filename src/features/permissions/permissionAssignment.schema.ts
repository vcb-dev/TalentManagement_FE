import { z } from 'zod'

const scopeKeySchema = z.literal('global')

/** Khớp BE `PermissionAssignmentRecord` / PUT body. */
export const permissionAssignmentRecordSchema = z.object({
  userId: z.string().uuid(),
  scopeKey: scopeKeySchema,
  roleTemplateIds: z.array(z.string()),
  grantedPermissionIds: z.array(z.string()),
  dataScopeFlags: z.record(z.string(), z.boolean()),
})

export type PermissionAssignmentRecordParsed = z.infer<typeof permissionAssignmentRecordSchema>
