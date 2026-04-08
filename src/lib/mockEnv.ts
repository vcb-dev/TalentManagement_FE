/**
 * `VITE_USE_MOCK_API === 'true'` — đăng nhập + HR + phân quyền (localStorage) không gọi BE.
 * Để kết nối TalentManagement_BE: đặt `false` hoặc bỏ biến; `VITE_API_URL` trỏ BE; xem `docs/prompt-api-phan-quyen-fe-ket-noi-be.md`.
 */
export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_API === 'true'
}
