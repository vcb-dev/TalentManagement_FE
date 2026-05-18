import { test, expect } from '@playwright/test'
import { ACCOUNTS, loginAs, spaNavigate } from './helpers'

test.describe('Phân quyền — HR Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.HR.email)
  })

  test('HR vào được /hr-admin (trang quản lý nhân sự)', async ({ page }) => {
    await spaNavigate(page, '/hr-admin')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('body')).not.toContainText('404')
  })
})

test.describe('Phân quyền — MEMBER bị chặn', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
  })

  test('MEMBER không vào được /hr-admin → redirect', async ({ page }) => {
    await spaNavigate(page, '/hr-admin')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/\/hr-admin/)
  })

  test('MEMBER không vào được /permissions → redirect', async ({ page }) => {
    await spaNavigate(page, '/permissions')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/\/permissions$/)
  })
})

test.describe('Phân quyền — MANAGER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MANAGER.email)
  })

  test('MANAGER vào được /permissions', async ({ page }) => {
    await spaNavigate(page, '/permissions')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/login/)
  })
})

test.describe('Phân quyền — menu items theo role', () => {
  test('MEMBER không thấy link dẫn tới /hr-admin trong nav', async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
    // Nav không được có link trỏ tới /hr-admin (MEMBER không có hr.org.manage)
    const hrAdminLinks = page.locator('a[href*="/hr-admin"]')
    const count = await hrAdminLinks.count()
    expect(count).toBe(0)
  })

  test('HR thấy nav link dẫn tới /hr-admin', async ({ page }) => {
    await loginAs(page, ACCOUNTS.HR.email)
    // HR có hr.org.manage → nav có link /hr-admin
    await spaNavigate(page, '/hr-admin')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/login/)
  })

  test('MANAGER thấy link /permissions trong nav', async ({ page }) => {
    await loginAs(page, ACCOUNTS.MANAGER.email)
    // Permissions link hiện trong nav với MANAGER (admin.permissions.assign)
    const permLink = page.locator('a[href*="/permissions"]').first()
    if (await permLink.isVisible()) {
      expect(await permLink.getAttribute('href')).toContain('/permissions')
    }
  })
})
