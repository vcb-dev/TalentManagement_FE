import { createFileRoute, redirect } from '@tanstack/react-router'

/** Chi tiết nhân sự dùng chung `/hr-admin/$employeeId`. */
export const Route = createFileRoute('/_protected/manager/team/$employeeId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/hr-admin/$employeeId',
      params: { employeeId: params.employeeId },
    })
  },
  component: () => null,
})
