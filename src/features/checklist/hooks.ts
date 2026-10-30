import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { checklistApi } from './api'
import { checklistKeys } from './queryKeys'
import type { ChecklistAnswers, ChecklistTemplateInput } from './types'

export function useMyChecklists(enabled = true) {
  return useQuery({
    queryKey: checklistKeys.mine(),
    queryFn: () => checklistApi.mine(),
    enabled,
  })
}

export function useLeaderChecklistEmployees(enabled = true) {
  return useQuery({
    queryKey: checklistKeys.leaderEmployees(),
    queryFn: () => checklistApi.leaderEmployees(),
    enabled,
  })
}

export function useLeaderEmployeeChecklists(employeeId: string | undefined) {
  return useQuery({
    queryKey: checklistKeys.leaderEmployee(employeeId ?? ''),
    queryFn: () => checklistApi.leaderEmployee(employeeId!),
    enabled: Boolean(employeeId),
  })
}

export function useChecklistTemplates(enabled = true) {
  return useQuery({
    queryKey: checklistKeys.templates(),
    queryFn: () => checklistApi.listTemplates(),
    enabled,
  })
}

export function useChecklistTemplate(id: string | undefined) {
  return useQuery({
    queryKey: checklistKeys.template(id ?? ''),
    queryFn: () => checklistApi.getTemplate(id!),
    enabled: Boolean(id),
  })
}

export function useChecklistTemplateResponses(id: string | undefined) {
  return useQuery({
    queryKey: checklistKeys.templateResponses(id ?? ''),
    queryFn: () => checklistApi.templateResponses(id!),
    enabled: Boolean(id),
  })
}

export function useEmployeeChecklists(employeeId: string, enabled: boolean) {
  return useQuery({
    queryKey: checklistKeys.employee(employeeId),
    queryFn: () => checklistApi.employeeChecklists(employeeId),
    enabled,
  })
}

/** Mọi mutation đều làm mới toàn bộ cache checklist — dữ liệu nhỏ, tránh sót màn đang mở. */
function useChecklistMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: checklistKeys.all })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useSaveMyChecklist() {
  return useChecklistMutation(
    (args: { templateId: string; answers: ChecklistAnswers }) =>
      checklistApi.saveMine(args.templateId, args.answers),
    { success: 'Đã lưu checklist', error: 'Không thể lưu checklist' }
  )
}

export function useSaveLeaderChecklist() {
  return useChecklistMutation(
    (args: { employeeId: string; templateId: string; answers: ChecklistAnswers }) =>
      checklistApi.saveLeader(args.employeeId, args.templateId, args.answers),
    { success: 'Đã lưu checklist', error: 'Không thể lưu checklist' }
  )
}

export function useCreateChecklistTemplate() {
  return useChecklistMutation(
    (input: ChecklistTemplateInput) => checklistApi.createTemplate(input),
    { success: 'Đã tạo checklist', error: 'Không thể tạo checklist' }
  )
}

export function useUpdateChecklistTemplate() {
  return useChecklistMutation(
    (args: { id: string; input: Partial<ChecklistTemplateInput> & { isActive?: boolean } }) =>
      checklistApi.updateTemplate(args.id, args.input),
    { success: 'Đã cập nhật checklist', error: 'Không thể cập nhật checklist' }
  )
}

export function useDeleteChecklistTemplate() {
  return useChecklistMutation((id: string) => checklistApi.removeTemplate(id), {
    success: 'Đã xoá checklist',
    error: 'Không thể xoá checklist',
  })
}
