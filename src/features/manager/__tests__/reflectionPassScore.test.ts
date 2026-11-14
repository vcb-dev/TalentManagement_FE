import { describe, expect, it } from 'vitest'
import { parsePassScoreInput } from '../components/ManagerHub/ReflectionPassScoreDialog'

describe('parsePassScoreInput', () => {
  it('nhận số nguyên 1–100', () => {
    expect(parsePassScoreInput('80')).toBe(80)
    expect(parsePassScoreInput(' 1 ')).toBe(1)
    expect(parsePassScoreInput('100')).toBe(100)
  })

  it('rỗng, 0, >100 hoặc không phải số → null', () => {
    for (const bad of ['', '0', '101', '7.5', 'abc', '-5']) {
      expect(parsePassScoreInput(bad)).toBeNull()
    }
  })
})
