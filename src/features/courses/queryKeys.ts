/** `manage` = dữ liệu admin (gồm khoá đang ẩn) — tách cache khỏi bản nhân sự. */
export const courseKeys = {
  all: ['courses'] as const,
  list: (manage: boolean) => [...courseKeys.all, 'list', manage] as const,
  options: () => [...courseKeys.all, 'options'] as const,
  detail: (id: string, manage: boolean) => [...courseKeys.all, 'detail', id, manage] as const,
}
