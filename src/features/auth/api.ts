import axios from 'axios'
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import {
  buildSessionWithAssignments,
  decodeMockToken,
  encodeMockToken,
  findMockUser,
  MOCK_PASSWORD,
} from './mock/mockAccounts'
import { meResponseSchema, type LoginRequest } from './schemas'

function mockLogin(body: LoginRequest) {
  const raw = findMockUser(body.username)
  if (!raw || body.password !== MOCK_PASSWORD) {
    const err = new Error('Sai tên đăng nhập hoặc mật khẩu') as Error & { status?: number }
    err.status = 401
    throw err
  }
  const user = buildSessionWithAssignments(raw)
  const accessToken = encodeMockToken(user.email)
  return safeParse(meResponseSchema, { user, accessToken }, 'mock login')
}

function mockMe() {
  const token = useAuthStore.getState().accessToken
  if (!token?.startsWith('mock.')) {
    const err = new Error('Unauthorized') as Error & { status?: number }
    err.status = 401
    throw err
  }
  const email = decodeMockToken(token)
  if (!email) {
    const err = new Error('Unauthorized') as Error & { status?: number }
    err.status = 401
    throw err
  }
  const raw = findMockUser(email)
  if (!raw) {
    const err = new Error('Unauthorized') as Error & { status?: number }
    err.status = 401
    throw err
  }
  const user = buildSessionWithAssignments(raw)
  return safeParse(meResponseSchema, { user, accessToken: token }, 'mock me')
}

export const authApi = {
  me: async () => {
    if (isMockApiEnabled()) {
      const token = useAuthStore.getState().accessToken
      if (token?.startsWith('mock.')) return mockMe()
      return { user: null, accessToken: null }
    }
    try {
      const res = await apiClient.get<unknown>('/auth/me')
      return safeParse(meResponseSchema, res.data, 'GET /auth/me')
    } catch (err) {
      // BE cũ trả 401 khi chưa đăng nhập — coi như không có phiên (tương thích tới khi deploy BE mới)
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return { user: null, accessToken: null }
      }
      throw err
    }
  },

  login: async (body: LoginRequest) => {
    if (isMockApiEnabled()) return mockLogin(body)
    const res = await apiClient.post<unknown>('/auth/login', body)
    return safeParse(meResponseSchema, res.data, 'POST /auth/login')
  },

  logout: async () => {
    if (!isMockApiEnabled()) {
      await apiClient.post<unknown>('/auth/logout')
    }
  },
}
