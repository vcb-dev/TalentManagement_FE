import { createFileRoute, redirect } from '@tanstack/react-router'

/** Đã gộp vào `/hr-admin` — giữ URL cũ để bookmark không gãy. */
export const Route = createFileRoute('/_protected/leader/team/')({
  beforeLoad: () => {
    throw redirect({ to: '/hr-admin', search: { page: 1 } })
  },
  component: () => null,
})
