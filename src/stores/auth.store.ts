import { create } from 'zustand'
import { clearSessionToken, persistSessionToken } from '@/features/auth/sessionTokenStorage'
import type { UserSession } from '@/types/auth'

export interface AuthStore {
  user: UserSession | null
  accessToken: string | null
  setSession: (user: UserSession, accessToken: string | null) => void
  setUser: (user: UserSession) => void
  setAccessToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => {
    if (accessToken) persistSessionToken(accessToken)
    else clearSessionToken()
    set({ user, accessToken })
  },
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => {
    if (accessToken) persistSessionToken(accessToken)
    else clearSessionToken()
    set({ accessToken })
  },
  logout: () => {
    clearSessionToken()
    set({ user: null, accessToken: null })
  },
}))
