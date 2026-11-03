import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'
import type {
  ChecklistAnswers,
  ChecklistFillItem,
  ChecklistTemplate,
  ChecklistTemplateInput,
  ChecklistTemplateResponses,
  EmployeeChecklists,
  LeaderChecklistEmployee,
  LeaderEmployeeChecklists,
} from './types'

type SavedResponse = { answers: ChecklistAnswers; updatedAt: string }

function mockUnsupported(): never {
  throw new Error('Chế độ mock chưa hỗ trợ checklist')
}

export const checklistApi = {
  mine: async () => {
    if (isMockApiEnabled()) return [] as ChecklistFillItem[]
    const res = await apiClient.get<ChecklistFillItem[]>('/checklists/me')
    return res.data
  },

  saveMine: async (templateId: string, answers: ChecklistAnswers) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<SavedResponse>(`/checklists/me/${templateId}`, { answers })
    return res.data
  },

  leaderEmployees: async () => {
    if (isMockApiEnabled()) return [] as LeaderChecklistEmployee[]
    const res = await apiClient.get<LeaderChecklistEmployee[]>('/checklists/leader/employees')
    return res.data
  },

  leaderEmployee: async (employeeId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.get<LeaderEmployeeChecklists>(
      `/checklists/leader/employees/${employeeId}`
    )
    return res.data
  },

  saveLeader: async (employeeId: string, templateId: string, answers: ChecklistAnswers) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.put<SavedResponse>(
      `/checklists/leader/employees/${employeeId}/${templateId}`,
      { answers }
    )
    return res.data
  },

  listTemplates: async () => {
    if (isMockApiEnabled()) return [] as ChecklistTemplate[]
    const res = await apiClient.get<ChecklistTemplate[]>('/checklists/templates')
    return res.data
  },

  getTemplate: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.get<ChecklistTemplate>(`/checklists/templates/${id}`)
    return res.data
  },

  createTemplate: async (input: ChecklistTemplateInput) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.post<ChecklistTemplate>('/checklists/templates', input)
    return res.data
  },

  updateTemplate: async (
    id: string,
    input: Partial<ChecklistTemplateInput> & { isActive?: boolean }
  ) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.patch<ChecklistTemplate>(`/checklists/templates/${id}`, input)
    return res.data
  },

  removeTemplate: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.delete<{ id: string }>(`/checklists/templates/${id}`)
    return res.data
  },

  templateResponses: async (id: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.get<ChecklistTemplateResponses>(
      `/checklists/templates/${id}/responses`
    )
    return res.data
  },

  employeeChecklists: async (employeeId: string) => {
    if (isMockApiEnabled()) mockUnsupported()
    const res = await apiClient.get<EmployeeChecklists>(`/checklists/employees/${employeeId}`)
    return res.data
  },
}
