/**
 * Phân quyền theo toàn hệ thống (không tách chi nhánh).
 * Giữ `ScopeKey` là literal để type khớp `PermissionAssignmentRecord`; chỉ dùng `global`.
 */
export type ScopeKey = 'global'
