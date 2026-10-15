import { describe, expect, it } from 'vitest'
import { checkLoginEmail } from '../loginEmail'

describe('checkLoginEmail', () => {
  it('Gmail hợp lệ → info', () => {
    expect(checkLoginEmail('nga.le.n2@gmail.com').tone).toBe('info')
    expect(checkLoginEmail(' A@GoogleMail.com ').tone).toBe('info')
  })

  it('trống / sai định dạng (dữ liệu cũ) → error', () => {
    for (const bad of [
      '',
      '   ',
      null,
      'ko dùng',
      'truongt',
      '71206kieuanh@gmail.',
      'Rebanmain@gmail. Com',
    ]) {
      expect(checkLoginEmail(bad).tone).toBe('error')
    }
  })

  it('gõ nhầm đuôi Gmail → warn kèm gợi ý', () => {
    const r = checkLoginEmail('vangbachoamai9999@gmai.com')
    expect(r.tone).toBe('warn')
    expect(r.message).toContain('vangbachoamai9999@gmail.com')
    expect(checkLoginEmail('Tranphuong24914@gmaik.com').tone).toBe('warn')
  })

  it('miền khác Gmail → warn (cần là tài khoản Google)', () => {
    const r = checkLoginEmail('dung@fpt.edu.vn')
    expect(r.tone).toBe('warn')
    expect(r.message).toContain('Google Workspace')
  })
})
