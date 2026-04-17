import { createFileRoute, redirect } from '@tanstack/react-router'

/** Đã gộp vào `/hr-admin` — giữ URL cũ để bookmark không gãy. */
export const Route = createFileRoute('/_protected/manager/team-progress')({
  beforeLoad: () => {
    throw redirect({ to: '/hr-admin', search: { page: 1, pageSize: 15 } })
  },
  component: () => null,
})
