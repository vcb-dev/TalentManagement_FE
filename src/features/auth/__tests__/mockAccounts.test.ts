import { describe, it, expect } from 'vitest'
import {
  findMockUser,
  encodeMockToken,
  decodeMockToken,
  MOCK_ACCOUNT_LIST,
} from '../mock/mockAccounts'

describe('findMockUser', () => {
  it('tìm đúng user theo email HR', () => {
    const user = findMockUser('hr.admin@vcb.com')
    expect(user).toBeDefined()
    expect(user?.role).toBe('HR')
  })

  it('tìm đúng user theo email MEMBER', () => {
    const user = findMockUser('nhanvien@vcb.com')
    expect(user).toBeDefined()
    expect(user?.role).toBe('MEMBER')
  })

  it('tìm đúng user theo email LEADER', () => {
    const user = findMockUser('leader@vcb.com')
    expect(user).toBeDefined()
    expect(user?.role).toBe('LEADER')
  })

  it('tìm đúng user theo email MANAGER', () => {
    const user = findMockUser('manager@vcb.com')
    expect(user).toBeDefined()
    expect(user?.role).toBe('MANAGER')
  })

  it('tìm đúng user theo email BOD', () => {
    const user = findMockUser('bod@vcb.com')
    expect(user).toBeDefined()
    expect(user?.role).toBe('BOD')
  })

  it('trả undefined với email không tồn tại', () => {
    expect(findMockUser('notexist@vcb.com')).toBeUndefined()
  })

  it('case-insensitive lookup', () => {
    const lower = findMockUser('hr.admin@vcb.com')
    const upper = findMockUser('HR.ADMIN@VCB.COM')
    expect(lower?.id).toBe(upper?.id)
  })

  it('trim khoảng trắng', () => {
    const user = findMockUser('  hr.admin@vcb.com  ')
    expect(user).toBeDefined()
  })

  it('mỗi mock user có id UUID-like', () => {
    MOCK_ACCOUNT_LIST.forEach((a) => {
      const user = findMockUser(a.username)
      expect(user?.id).toMatch(/^[0-9a-f-]{36}$/i)
    })
  })

  it('mỗi mock user có permissionIds không rỗng', () => {
    MOCK_ACCOUNT_LIST.forEach((a) => {
      const user = findMockUser(a.username)
      expect(user?.permissionIds?.length).toBeGreaterThan(0)
    })
  })
})

describe('encodeMockToken / decodeMockToken', () => {
  it('encode rồi decode trả đúng email', () => {
    const email = 'hr.admin@vcb.com'
    const token = encodeMockToken(email)
    const decoded = decodeMockToken(token)
    expect(decoded).toBe(email)
  })

  it('token luôn bắt đầu bằng "mock."', () => {
    const token = encodeMockToken('test@vcb.com')
    expect(token.startsWith('mock.')).toBe(true)
  })

  it('decodeMockToken trả null với token không hợp lệ', () => {
    expect(decodeMockToken('Bearer xxx')).toBeNull()
    expect(decodeMockToken('')).toBeNull()
    expect(decodeMockToken('not.valid')).toBeNull()
  })

  it('decodeMockToken trả null với chuỗi không phải mock.', () => {
    expect(decodeMockToken('jwt.header.payload')).toBeNull()
  })

  it('encode lowercase email', () => {
    const token = encodeMockToken('HR.ADMIN@VCB.COM')
    const decoded = decodeMockToken(token)
    expect(decoded).toBe('hr.admin@vcb.com')
  })
})

describe('MOCK_ACCOUNT_LIST', () => {
  it('danh sách có ít nhất 5 tài khoản', () => {
    expect(MOCK_ACCOUNT_LIST.length).toBeGreaterThanOrEqual(5)
  })

  it('không có username trùng nhau', () => {
    const usernames = MOCK_ACCOUNT_LIST.map((a) => a.username.toLowerCase())
    const unique = new Set(usernames)
    expect(unique.size).toBe(usernames.length)
  })

  it('bao gồm các role cần thiết', () => {
    const roles = new Set(MOCK_ACCOUNT_LIST.map((a) => a.role))
    expect(roles.has('HR')).toBe(true)
    expect(roles.has('MEMBER')).toBe(true)
    expect(roles.has('LEADER')).toBe(true)
    expect(roles.has('MANAGER')).toBe(true)
    expect(roles.has('BOD')).toBe(true)
  })
})
