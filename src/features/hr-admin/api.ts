import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { safeParse } from '@/lib/utils'
import type { CreateEmployeeInput, PatchEmployeeInput } from '@/types/api'
import type { z } from 'zod'
import type { IHrEmployeeProfileState } from './components/HrEmployeeProfile/HrEmployeeProfile'
import {
  getMockEmployeeById,
  getMockEmployeeProfileById,
  getMockEmployees,
  getMockEmployeesExport,
  mockCreateEmployee,
  mockDeactivateEmployee,
  mockPatchEmployee,
  mockUpdateEmployeeProfile,
  type CreateEmployeeMeta,
} from './mock/mockEmployeesData'
import { employeeApiSchema, employeeExportApiSchema, employeeListApiSchema } from './schemas'
import type { EmployeeFilters } from './types'

export type { CreateEmployeeMeta }

export type IdCardPhotoField = 'attachmentIdFront' | 'attachmentIdBack'
export type PrivateDocField = IdCardPhotoField | 'cvAttachmentRef'

export type EmployeeOrgChange = {
  id: string
  field: string
  fieldLabel: string
  fromLabel: string | null
  toLabel: string | null
  changedAt: string
  changedByName: string | null
}

function statusToApi(status: EmployeeFilters['status']): string | undefined {
  if (!status) return undefined
  return status.toUpperCase()
}

function filterParams(filters: Omit<EmployeeFilters, 'page' | 'pageSize'>) {
  return {
    ...(filters.roles?.trim()
      ? { roles: filters.roles.trim() }
      : filters.role
        ? { role: filters.role }
        : {}),
    status: statusToApi(filters.status),
    search: filters.search,
    teamId: filters.teamId,
    startMonth: filters.startMonth,
    startYear: filters.startYear,
    birthMonth: filters.birthMonth,
  }
}

export const employeeApi = {
  getAll: async (filters: EmployeeFilters) => {
    if (isMockApiEnabled()) {
      const raw = getMockEmployees(filters)
      return safeParse(employeeListApiSchema, raw, 'GET /employees (mock)')
    }
    const res = await apiClient.get<unknown>('/employees', {
      params: { page: filters.page, pageSize: filters.pageSize, ...filterParams(filters) },
    })
    return safeParse(employeeListApiSchema, res.data, 'GET /employees')
  },

  /** Toàn bộ nhân sự theo bộ lọc, kèm trường hồ sơ (CCCD, địa chỉ…) để xuất Excel. */
  getExportRows: async (filters: Omit<EmployeeFilters, 'page' | 'pageSize'>) => {
    if (isMockApiEnabled()) {
      const raw = getMockEmployeesExport(filters)
      return safeParse(employeeExportApiSchema, raw, 'GET /employees/export (mock)')
    }
    const res = await apiClient.get<unknown>('/employees/export', {
      params: filterParams(filters),
    })
    return safeParse(employeeExportApiSchema, res.data, 'GET /employees/export')
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
    if (isMockApiEnabled()) {
      const row = getMockEmployeeProfileById(id)
      if (!row) {
        const err = new Error('Not found') as Error & { status?: number }
        err.status = 404
        throw err
      }
      return row
    }
    const res = await apiClient.get<IHrEmployeeProfileState>(`/employees/hr/${id}`)
    return res.data
  },

  listOrgChanges: async (id: string) => {
    if (isMockApiEnabled()) return [] as EmployeeOrgChange[]
    const res = await apiClient.get<EmployeeOrgChange[]>(`/employees/hr/${id}/org-changes`)
    return res.data
  },

  // update employee by id
  updateEmployeeById: async (id: string, patch: IHrEmployeeProfileState) => {
    if (isMockApiEnabled()) {
      const row = mockUpdateEmployeeProfile(id, patch)
      if (!row) {
        const err = new Error('Not found') as Error & { status?: number }
        err.status = 404
        throw err
      }
      return row
    }
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

  uploadAttachment: async (id: string, field: PrivateDocField, file: File) => {
    if (isMockApiEnabled()) {
      return { field, objectPath: `mock/${field}/${file.name}` }
    }
    const body = new FormData()
    body.append('file', file)
    const res = await apiClient.post<{ field: PrivateDocField; objectPath: string }>(
      `/employees/${id}/attachments/${field}`,
      body,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },

  getLoginCredential: async (id: string) => {
    if (isMockApiEnabled()) {
      return { username: null as string | null }
    }
    const res = await apiClient.get<{ username: string | null }>(
      `/employees/${id}/login-credential`
    )
    return res.data
  },

  upsertLoginCredential: async (id: string, body: { username: string; password: string }) => {
    if (isMockApiEnabled()) {
      return { username: body.username }
    }
    const res = await apiClient.put<{ username: string }>(`/employees/${id}/login-credential`, body)
    return res.data
  },
}

export type EmployeeEntity = z.infer<typeof employeeApiSchema>
export type EmployeeExportRow = z.infer<typeof employeeExportApiSchema>['data'][number]
