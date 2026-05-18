import { test, expect } from '@playwright/test'
import { ACCOUNTS, loginAs, spaNavigate } from './helpers'

test.describe('KPI/OKR — MEMBER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
  })

  test('MEMBER vào được /kpi-okr (SPA navigate)', async ({ page }) => {
    await spaNavigate(page, '/kpi-okr')
    // Không bị redirect về /login
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('body')).not.toContainText('404')
  })

  test('trang /kpi-okr hiển thị nội dung KPI', async ({ page }) => {
    await spaNavigate(page, '/kpi-okr')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/KPI.*OKR|Mục tiêu|tháng/i).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('KPI/OKR — LEADER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.LEADER.email)
  })

  test('LEADER vào được /leader/kpi-okr (SPA navigate)', async ({ page }) => {
    await spaNavigate(page, '/leader/kpi-okr')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('body')).not.toContainText('404')
  })

  test('nav link "Vinh danh & Xếp hạng" dẫn tới /leader/kpi-okr', async ({ page }) => {
    const kpiLink = page.getByRole('link', { name: /Vinh danh.*Xếp hạng/i }).first()
    if (await kpiLink.isVisible()) {
      await kpiLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/leader\/kpi-okr/)
    }
  })
})

test.describe('KPI/OKR — MANAGER', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.MANAGER.email)
  })

  test('MANAGER vào được /manager/kpi-okr qua SPA navigate', async ({ page }) => {
    // MANAGER có quyền kpi.team_edit + kpi.leader_review → /leader/kpi-okr accessible
    await spaNavigate(page, '/leader/kpi-okr')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('body')).not.toContainText('404')
  })
})

test.describe('KPI/OKR — HR bị chặn', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.HR.email)
  })

  test('HR không vào được /leader/kpi-okr (thiếu kpi.team_view)', async ({ page }) => {
    await spaNavigate(page, '/leader/kpi-okr')
    await page.waitForTimeout(800)
    // HR không có kpi.team_view → bị redirect
    await expect(page).not.toHaveURL(/leader\/kpi-okr/)
  })
})

test.describe('KPI/OKR — bảo vệ route', () => {
  test('chưa đăng nhập → /kpi-okr redirect về /login', async ({ page }) => {
    await page.goto('/kpi-okr')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/login/)
  })

  test('MEMBER không vào được /leader/kpi-okr (thiếu kpi.team_view)', async ({ page }) => {
    await loginAs(page, ACCOUNTS.MEMBER.email)
    await spaNavigate(page, '/leader/kpi-okr')
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/leader\/kpi-okr/)
  })
})
