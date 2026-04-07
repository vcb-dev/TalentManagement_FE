import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { decodeMockToken, encodeMockToken, findMockUser, MOCK_PASSWORD } from './mock/mockAccounts'
import { meResponseSchema, type LoginRequest } from './schemas'

function mockLogin(body: LoginRequest) {
  const user = findMockUser(body.email)
  if (!user || body.password !== MOCK_PASSWORD) {
    const err = new Error('Sai email hoặc mật khẩu') as Error & { status?: number }
    err.status = 401
    throw err
  }
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
  const user = findMockUser(email)
  if (!user) {
    const err = new Error('Unauthorized') as Error & { status?: number }
    err.status = 401
    throw err
  }
  return safeParse(meResponseSchema, { user, accessToken: token }, 'mock me')
}

export const authApi = {
  me: async () => {
    if (isMockApiEnabled()) {
      const token = useAuthStore.getState().accessToken
      if (token?.startsWith('mock.')) return mockMe()
    }
    const res = await apiClient.get<unknown>('/auth/me')
    return safeParse(meResponseSchema, res.data, 'GET /auth/me')
  },

  login: async (body: LoginRequest) => {
    if (isMockApiEnabled()) return mockLogin(body)
    const res = await apiClient.post<unknown>('/auth/login', body)
    return safeParse(meResponseSchema, res.data, 'POST /auth/login')
  },

  googleLogin: async (idToken: string) => {
    if (isMockApiEnabled()) {
      const err = new Error('Đăng nhập Google không dùng được khi bật mock API') as Error & {
        status?: number
      }
      err.status = 400
      throw err
    }
    const res = await apiClient.post<unknown>('/auth/google', { idToken })
    return safeParse(meResponseSchema, res.data, 'POST /auth/google')
  },
}
