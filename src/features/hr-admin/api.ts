import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import type { CreateEmployeeInput, PatchEmployeeInput } from '@/types/api'
import type { z } from 'zod'
import {
  getMockEmployeeById,
  getMockEmployees,
  mockCreateEmployee,
  mockDeactivateEmployee,
  mockPatchEmployee,
  type CreateEmployeeMeta,
} from './mock/mockEmployeesData'
import { employeeApiSchema, employeeListApiSchema } from './schemas'
import type { EmployeeFilters } from './types'
import type { IHrEmployeeProfileState } from './components/HrEmployeeProfile/HrEmployeeProfile'

export type { CreateEmployeeMeta }

function statusToApi(status: EmployeeFilters['status']): string | undefined {
  if (!status) return undefined
  return status.toUpperCase()
}

export const employeeApi = {
  getAll: async (filters: EmployeeFilters) => {
    if (isMockApiEnabled()) {
      const raw = getMockEmployees(filters)
      return safeParse(employeeListApiSchema, raw, 'GET /employees (mock)')
    }
    const res = await apiClient.get<unknown>('/employees', {
      params: {
        page: filters.page,
        pageSize: filters.pageSize,
        ...(filters.roles?.trim()
          ? { roles: filters.roles.trim() }
          : filters.role
            ? { role: filters.role }
            : {}),
        status: statusToApi(filters.status),
        search: filters.search,
        teamId: filters.teamId,
      },
    })
    return safeParse(employeeListApiSchema, res.data, 'GET /employees')
  },

  getById: async (id: string) => {
    if (isMockApiEnabled()) {
      const row = getMockEmployeeById(id)
      if (!row) {
        const err = new Error('Not found') as Error & { status?: number }
        err.status = 404
        throw err
      }
      return safeParse(employeeApiSchema, row, `GET /employees/${id} (mock)`)
    }
    const res = await apiClient.get<unknown>(`/employees/${id}`)
    return safeParse(employeeApiSchema, res.data, `GET /employees/${id}`)
  },

  create: async (input: CreateEmployeeInput, meta?: CreateEmployeeMeta) => {
    if (isMockApiEnabled()) {
      return safeParse(employeeApiSchema, mockCreateEmployee(input, meta), 'POST /employees (mock)')
    }
    const res = await apiClient.post<unknown>('/employees', input)
    return safeParse(employeeApiSchema, res.data, 'POST /employees')
  },

  deactivate: async (id: string) => {
    if (isMockApiEnabled()) {
      const row = mockDeactivateEmployee(id)
      if (!row) {
        const err = new Error('Not found') as Error & { status?: number }
        err.status = 404
        throw err
      }
      return safeParse(employeeApiSchema, row, `PATCH /employees/${id}/deactivate (mock)`)
    }
    const res = await apiClient.patch<unknown>(`/employees/${id}/deactivate`)
    return safeParse(employeeApiSchema, res.data, `PATCH /employees/${id}/deactivate`)
  },

  update: async (id: string, patch: PatchEmployeeInput) => {
    if (isMockApiEnabled()) {
      const row = mockPatchEmployee(id, patch)
      if (!row) {
        const err = new Error('Not found') as Error & { status?: number }
        err.status = 404
        throw err
      }
      return safeParse(employeeApiSchema, row, `PATCH /employees/${id} (mock)`)
    }
    const res = await apiClient.patch<unknown>(`/employees/${id}`, patch)
    return safeParse(employeeApiSchema, res.data, `PATCH /employees/${id}`)
  },

  // get employee by id
  getEmployeeById: async (id: string) => {
    const res = await apiClient.get<IHrEmployeeProfileState>(`/employees/hr/${id}`)
    return res.data
  },

  // update employee by id
  updateEmployeeById: async (id: string, patch: IHrEmployeeProfileState) => {
    const res = await apiClient.patch<unknown>(`/employees/hr/${id}`, patch)
    return res.data
  },

  getAttachmentSignedUrl: async (id: string, field: string) => {
    if (isMockApiEnabled()) {
      return { signedUrl: null as string | null }
    }
    const res = await apiClient.get<{ signedUrl: string | null }>(
      `/employees/${id}/attachments/${field}/signed-url`
    )
    return res.data
  },

  getLoginCredential: async (id: string) => {
    const res = await apiClient.get<{ username: string | null }>(
      `/employees/${id}/login-credential`
    )
    return res.data
  },

  upsertLoginCredential: async (id: string, body: { username: string; password: string }) => {
    const res = await apiClient.put<{ username: string }>(`/employees/${id}/login-credential`, body)
    return res.data
  },
}

export type EmployeeEntity = z.infer<typeof employeeApiSchema>
