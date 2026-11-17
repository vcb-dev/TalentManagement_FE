import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { checklistKeys } from '@/features/checklist/queryKeys'
import { profileKeys } from '@/features/profile/queryKeys'
import {
  myProjectApi,
  projectApi,
  type AddProjectMembersInput,
  type CreateProjectInput,
  type ProjectMembershipInput,
  type SelectableProject,
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

/**
 * Dự án của ai: HR sửa hồ sơ một nhân sự (`/employees/hr/:id/projects`), hoặc nhân sự tự sửa của
 * mình trong Hồ sơ cá nhân (`/me/projects`).
 */
export type ProjectMembershipOwner = { kind: 'employee'; employeeId: string } | { kind: 'self' }

function membershipsKey(owner: ProjectMembershipOwner) {
  return owner.kind === 'self' ? profileKeys.projects() : employeeKeys.projects(owner.employeeId)
}

export function useProjectMemberships(owner: ProjectMembershipOwner) {
  return useQuery({
    queryKey: membershipsKey(owner),
    queryFn: () =>
      owner.kind === 'self' ? myProjectApi.list() : projectApi.listForEmployee(owner.employeeId),
    enabled: owner.kind === 'self' || owner.employeeId.length > 0,
  })
}

/** Ô chọn dự án: HR thấy mọi dự án; nhân sự tự thêm chỉ thấy dự án chưa kết thúc. */
export function useSelectableProjects(owner: ProjectMembershipOwner) {
  return useQuery<SelectableProject[]>({
    queryKey: owner.kind === 'self' ? profileKeys.projectOptions() : projectKeys.list(),
    queryFn: () => (owner.kind === 'self' ? myProjectApi.options() : projectApi.list()),
    staleTime: 60_000,
  })
}

function useProjectMembershipMutation<TArgs>(
  owner: ProjectMembershipOwner,
  mutationFn: (args: TArgs) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: membershipsKey(owner) })
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.orderNumbers() })
      // Dự án hiện trên đầu form checklist.
      void qc.invalidateQueries({ queryKey: checklistKeys.all })
      toast.success(messages.success)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e) || messages.error)
    },
  })
}

export function useAssignProjectMembership(owner: ProjectMembershipOwner) {
  const self = owner.kind === 'self'
  return useProjectMembershipMutation(
    owner,
    (input: ProjectMembershipInput) =>
      owner.kind === 'self'
        ? myProjectApi.assign(input)
        : projectApi.assign(owner.employeeId, input),
    self
      ? { success: 'Đã thêm dự án', error: 'Không thể thêm dự án' }
      : { success: 'Đã gán dự án', error: 'Không thể gán dự án' }
  )
}

export function useUpdateProjectMembership(owner: ProjectMembershipOwner) {
  return useProjectMembershipMutation(
    owner,
    (args: { membershipId: string; input: Partial<ProjectMembershipInput> }) =>
      owner.kind === 'self'
        ? myProjectApi.updateMembership(args.membershipId, args.input)
        : projectApi.updateMembership(owner.employeeId, args.membershipId, args.input),
    { success: 'Đã cập nhật dự án', error: 'Không thể cập nhật dự án' }
  )
}

export function useRemoveProjectMembership(owner: ProjectMembershipOwner) {
  const self = owner.kind === 'self'
  return useProjectMembershipMutation(
    owner,
    (membershipId: string) =>
      owner.kind === 'self'
        ? myProjectApi.removeMembership(membershipId)
        : projectApi.removeMembership(owner.employeeId, membershipId),
    self
      ? { success: 'Đã gỡ dự án', error: 'Không thể gỡ dự án' }
      : { success: 'Đã gỡ nhân sự khỏi dự án', error: 'Không thể gỡ dự án' }
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
