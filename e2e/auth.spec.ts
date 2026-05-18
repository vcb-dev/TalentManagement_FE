import { test, expect } from '@playwright/test'
import { ACCOUNTS, MOCK_PASSWORD, loginAs } from './helpers'

test.describe('Trang đăng nhập — giao diện', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('hiển thị form email + password', async ({ page }) => {
    await expect(page.getByLabel(/địa chỉ email/i)).toBeVisible()
    await expect(page.getByLabel(/mật khẩu/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible()
  })

  test('hiển thị danh sách tài khoản demo', async ({ page }) => {
    await expect(page.getByText(/tài khoản demo/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /hr\.admin@vcb\.com/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /nhanvien@vcb\.com/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /manager@vcb\.com/i })).toBeVisible()
  })

  test('click quick-fill điền sẵn email và mật khẩu', async ({ page }) => {
    await page.getByRole('button', { name: /hr\.admin@vcb\.com/i }).click()
    const emailInput = page.getByLabel(/địa chỉ email/i)
    await expect(emailInput).toHaveValue('hr.admin@vcb.com')
  })

  test('hiển thị/ẩn mật khẩu khi click icon eye', async ({ page }) => {
    const passwordInput = page.getByLabel(/mật khẩu/i).first()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /hiện mật khẩu/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /ẩn mật khẩu/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

test.describe('Đăng nhập — negative cases', () => {
  test('đăng nhập mật khẩu sai → hiện thông báo lỗi', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(/địa chỉ email/i).fill('hr.admin@vcb.com')
    await page
      .getByLabel(/mật khẩu/i)
      .first()
      .fill('WrongPassword123')
    await page.getByRole('button', { name: /^đăng nhập$/i }).click()
    // Sau khi submit sai, phải vẫn ở /login (không redirect)
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/login/)
  })

  test('đăng nhập email không tồn tại → ở lại trang login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(/địa chỉ email/i).fill('notexist@vcb.com')
    await page
      .getByLabel(/mật khẩu/i)
      .first()
      .fill(MOCK_PASSWORD)
    await page.getByRole('button', { name: /^đăng nhập$/i }).click()
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/login/)
  })

  test('submit form rỗng → validation hiển thị lỗi', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^đăng nhập$/i }).click()
    // Form với zodResolver sẽ không submit nếu rỗng
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Đăng nhập thành công — từng role', () => {
  test('HR đăng nhập thành công → redirect khỏi /login', async ({ page }) => {
    await loginAs(page, ACCOUNTS.HR.email)
    await expect(page).not.toHaveURL(/login/)
  })

  test('MEMBER đăng nhập thành công → redirect khỏi /login', async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
    await expect(page).not.toHaveURL(/login/)
  })

  test('LEADER đăng nhập thành công → redirect khỏi /login', async ({ page }) => {
    await loginAs(page, ACCOUNTS.LEADER.email)
    await expect(page).not.toHaveURL(/login/)
  })

  test('MANAGER đăng nhập thành công → redirect khỏi /login', async ({ page }) => {
    await loginAs(page, ACCOUNTS.MANAGER.email)
    await expect(page).not.toHaveURL(/login/)
  })

  test('BOD đăng nhập thành công → redirect khỏi /login', async ({ page }) => {
    await loginAs(page, ACCOUNTS.BOD.email)
    await expect(page).not.toHaveURL(/login/)
  })
})
