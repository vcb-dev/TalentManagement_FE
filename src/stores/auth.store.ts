import { create } from 'zustand'
import type { UserSession } from '@/types/auth'

export interface AuthStore {
  user: UserSession | null
  accessToken: string | null
  setSession: (user: UserSession, accessToken: string) => void
  setUser: (user: UserSession) => void
  setAccessToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}))
