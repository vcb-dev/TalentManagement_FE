import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import {
  projectApi,
  type AddProjectMembersInput,
  type CreateProjectInput,
  type ProjectMembershipInput,
} from './projectApi'
import { employeeKeys, projectKeys } from './queryKeys'

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectApi.list(),
    staleTime: 60_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectApi.create(input),
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(`Đã tạo dự án "${project.name}"`)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể tạo dự án')
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: Partial<CreateProjectInput> }) =>
      projectApi.update(args.id, args.input),
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      // Tên / trạng thái dự án hiện trong thẻ "Dự án tham gia" của từng hồ sơ nhân sự.
      void qc.invalidateQueries({ queryKey: [...employeeKeys.all, 'projects'] })
      // Dự án chuyển "Hoàn thành" → thành viên về đánh số theo team.
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      toast.success(`Đã cập nhật dự án "${project.name}"`)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể cập nhật dự án')
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      toast.success('Đã xoá dự án')
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể xoá dự án')
    },
  })
}

export function useProjectMembers(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => projectApi.listMembers(projectId),
    enabled: enabled && projectId.length > 0,
  })
}

export function useEmployeeProjects(employeeId: string) {
  return useQuery({
    queryKey: employeeKeys.projects(employeeId),
    queryFn: () => projectApi.listForEmployee(employeeId),
    enabled: employeeId.length > 0,
  })
}

function useEmployeeProjectMutation<TArgs>(
  employeeId: string,
  mutationFn: (args: TArgs) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.projects(employeeId) })
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useAssignEmployeeProject(employeeId: string) {
  return useEmployeeProjectMutation(
    employeeId,
    (input: ProjectMembershipInput) => projectApi.assign(employeeId, input),
    { success: 'Đã gán dự án', error: 'Không thể gán dự án' }
  )
}

export function useUpdateEmployeeProject(employeeId: string) {
  return useEmployeeProjectMutation(
    employeeId,
    (args: { membershipId: string; input: Partial<ProjectMembershipInput> }) =>
      projectApi.updateMembership(employeeId, args.membershipId, args.input),
    { success: 'Đã cập nhật dự án', error: 'Không thể cập nhật dự án' }
  )
}

export function useRemoveEmployeeProject(employeeId: string) {
  return useEmployeeProjectMutation(
    employeeId,
    (membershipId: string) => projectApi.removeMembership(employeeId, membershipId),
    { success: 'Đã gỡ nhân sự khỏi dự án', error: 'Không thể gỡ dự án' }
  )
}

function useProjectMemberMutation<TArgs extends { employeeId: string }>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.projects(employeeId) })
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useAddProjectMembers(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddProjectMembersInput) => projectApi.addMembers(projectId, input),
    onSuccess: ({ addedCount }, { userIds }) => {
      for (const userId of userIds) {
        void qc.invalidateQueries({ queryKey: employeeKeys.projects(userId) })
      }
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      toast.success(`Đã thêm ${addedCount} nhân sự vào dự án`)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || 'Không thể thêm nhân sự')
    },
  })
}

export function useRemoveProjectMember() {
  return useProjectMemberMutation(
    (args: { employeeId: string; membershipId: string }) =>
      projectApi.removeMembership(args.employeeId, args.membershipId),
    { success: 'Đã gỡ nhân sự khỏi dự án', error: 'Không thể gỡ nhân sự' }
  )
}
