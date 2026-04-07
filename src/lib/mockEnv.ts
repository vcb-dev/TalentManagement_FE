/**
 * Bật API giả (đăng nhập + HR) khi chưa có backend — cấu hình trong `.env`.
 * Khi chỉ dùng API thật: checklist gỡ mock trong `.cursor/rules/backend-mock-removal.mdc`.
 */
export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_API === 'true'
}
