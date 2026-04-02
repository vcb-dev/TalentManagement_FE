import { create } from 'zustand'

export interface AppNotification {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export interface NotificationStore {
  items: AppNotification[]
  add: (n: Omit<AppNotification, 'id' | 'read'> & { id?: string }) => void
  markRead: (id: string) => void
  clear: () => void
}

function createId(): string {
  return crypto.randomUUID()
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  add: (n) =>
    set((s) => ({
      items: [
        {
          id: n.id ?? createId(),
          title: n.title,
          body: n.body,
          read: false,
          createdAt: n.createdAt,
        },
        ...s.items,
      ],
    })),
  markRead: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
    })),
  clear: () => set({ items: [] }),
}))
