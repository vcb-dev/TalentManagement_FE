/**
 * Thứ tự mới khi đổi chỗ phần tử `index` với phần tử kề trên (`-1`) / dưới (`1`).
 * `null` = đã ở đầu / cuối, không cần gọi API.
 */
export function moveId(ids: readonly string[], index: number, delta: -1 | 1): string[] | null {
  const target = index + delta
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null
  // Đã kiểm tra biên ở trên.
  const next = [...ids]
  next[index] = ids[target] as string
  next[target] = ids[index] as string
  return next
}
