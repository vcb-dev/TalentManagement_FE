import { type Page } from '@playwright/test'

export const MOCK_PASSWORD = 'Demo@123'

export const ACCOUNTS = {
  HR: { email: 'hr.admin@vcb.com', role: 'HR', label: 'HR Admin' },
  MEMBER: { email: 'nhanvien@vcb.com', role: 'MEMBER', label: 'Nhân viên' },
  LEADER: { email: 'leader@vcb.com', role: 'LEADER', label: 'Leader' },
  MANAGER: { email: 'manager@vcb.com', role: 'MANAGER', label: 'Manager' },
  BOD: { email: 'bod@vcb.com', role: 'BOD', label: 'BOD' },
} as const

/** Đăng nhập bằng mock account. Gọi sau khi đã ở trang /login. */
export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByLabel(/địa chỉ email/i).fill(email)
  await page
    .getByLabel(/mật khẩu/i)
    .first()
    .fill(MOCK_PASSWORD)
  await page.getByRole('button', { name: /đăng nhập/i }).click()
  // Chờ redirect sau đăng nhập
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 })
}

/** Đăng nhập bằng nút quick-fill trong danh sách demo. */
export async function loginByQuickFill(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: new RegExp(email, 'i') }).click()
  await page.getByRole('button', { name: /^đăng nhập$/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 })
}

/**
 * Điều hướng trong SPA (không reload trang) bằng cách dispatch popstate event.
 * Dùng thay `page.goto()` cho protected routes để giữ Zustand auth state.
 */
export async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
  }, path)
  await page.waitForTimeout(500)
}
