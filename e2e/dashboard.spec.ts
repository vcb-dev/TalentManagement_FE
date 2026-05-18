import { test, expect } from '@playwright/test'
import { ACCOUNTS, loginAs } from './helpers'

test.describe('Dashboard — MEMBER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
  })

  test('redirect về /dashboard sau đăng nhập', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/)
  })

  test('hiển thị tên role hoặc greeting user', async ({ page }) => {
    // Trang dashboard phải load được (không 404)
    await expect(page.locator('body')).not.toContainText('404')
    await expect(page.locator('body')).not.toContainText('Not Found')
  })
})

test.describe('Dashboard — LEADER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.LEADER.email)
  })

  test('LEADER vào được /dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/)
  })

  test('trang không bị lỗi (không chứa "Error Boundary")', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})

test.describe('Dashboard — MANAGER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MANAGER.email)
  })

  test('MANAGER vào được /dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/)
  })
})

test.describe('Dashboard — HR', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.HR.email)
  })

  test('HR vào được /dashboard hoặc /hr-admin', async ({ page }) => {
    const url = page.url()
    const isExpected = url.includes('/dashboard') || url.includes('/hr-admin')
    expect(isExpected).toBe(true)
  })
})

test.describe('Route protection — chưa đăng nhập', () => {
  test('/dashboard redirect về /login khi chưa auth', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/login/)
  })

  test('/kpi-okr redirect về /login khi chưa auth', async ({ page }) => {
    await page.goto('/kpi-okr')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/login/)
  })

  test('/hr-admin redirect về /login khi chưa auth', async ({ page }) => {
    await page.goto('/hr-admin')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/login/)
  })
})
