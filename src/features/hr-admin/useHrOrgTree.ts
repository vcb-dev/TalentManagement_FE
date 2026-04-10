import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { organizationApi, type OrgTreeResponse } from '@/features/organization/api'
import { HR_DEPARTMENT_OPTIONS, HR_TEAM_OPTIONS } from '@/features/hr-admin/hrOrgOptions'

const ORG_TREE_KEY = ['organization-tree'] as const

export function useHrOrgTree() {
  return useQuery({
    queryKey: ORG_TREE_KEY,
    queryFn: () => organizationApi.getTree(),
    staleTime: 60_000,
  })
}

/** Options cho select phòng ban / team (API hoặc fallback static). */
export function useHrOrgSelectOptions() {
  const q = useHrOrgTree()

  return useMemo(() => {
    const data = q.data as OrgTreeResponse | undefined
    const departments = (
      data?.departments?.length
        ? data.departments.map((d) => ({ value: d.id, label: d.name }))
        : HR_DEPARTMENT_OPTIONS.map((d) => ({ value: d.value, label: d.label }))
    ) as {
      value: string
      label: string
    }[]

    const teamsByDept = new Map<string, { value: string; label: string }[]>()
    if (data?.departments?.length) {
      for (const d of data.departments) {
        teamsByDept.set(
          d.id,
          d.teams.map((t) => ({ value: t.id, label: t.name }))
        )
      }
    } else {
      const teamDeptMap: Record<string, string> = {
        '22222222-2222-4222-8222-222222222222': '11111111-1111-4111-8111-111111111111',
        '66666666-6666-4666-8666-666666666666': '11111111-1111-4111-8111-111111111111',
        '77777777-7777-4777-8777-777777777777': '22222222-2222-4222-8222-222222222221',
      }
      for (const t of HR_TEAM_OPTIONS) {
        const did = teamDeptMap[t.value]
        if (!did) continue
        const arr = teamsByDept.get(did) ?? []
        arr.push({ value: t.value, label: t.label })
        teamsByDept.set(did, arr)
      }
    }

    const allTeams = (
      data?.departments?.length
        ? data.departments.flatMap((d) => d.teams.map((t) => ({ value: t.id, label: t.name })))
        : HR_TEAM_OPTIONS.map((t) => ({ value: t.value, label: t.label }))
    ) as {
      value: string
      label: string
    }[]

    return {
      departments,
      teamsByDept,
      allTeams,
      isLoading: q.isLoading,
      error: q.error,
      refetch: q.refetch,
    }
  }, [q.data, q.isLoading, q.error, q.refetch])
}

export { ORG_TREE_KEY }
