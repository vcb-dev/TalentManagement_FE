import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/types/api'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { useAuthStore } from '@/stores/auth.store'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status
    if (status === 401) {
      const token = useAuthStore.getState().accessToken
      const sessionMock = isMockApiEnabled() && token?.startsWith('mock.')
      if (!sessionMock) {
        useAuthStore.getState().logout()
        const loginPath = '/login'
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith(loginPath)) {
          window.location.assign(loginPath)
        }
      }
    }
    return Promise.reject(error)
  }
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.message) return data.message
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return 'Đã có lỗi xảy ra'
}
