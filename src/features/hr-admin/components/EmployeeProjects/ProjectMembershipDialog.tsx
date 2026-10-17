import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DateController,
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import {
  PROJECT_STATUS_LABEL,
  SHOW_PROJECT_ROLE,
  type EmployeeProjectMembership,
} from '@/features/hr-admin/projectApi'
import {
  useAssignEmployeeProject,
  useProjects,
  useUpdateEmployeeProject,
} from '@/features/hr-admin/projectHooks'
import {
  projectMembershipFormSchema,
  type ProjectMembershipForm,
} from '@/features/hr-admin/schemas'
import { getVnNow } from '@/hooks/useVnTime'
import { useZodForm } from '@/lib/forms/useZodForm'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { ProjectFormDialog } from './ProjectFormDialog'

function toFormValues(membership: EmployeeProjectMembership | null): ProjectMembershipForm {
  if (!membership) {
    return { projectId: '', roleInProject: '', joinedAt: getVnNow().date, leftAt: '', note: '' }
  }
  return {
    projectId: membership.projectId,
    roleInProject: membership.roleInProject ?? '',
    joinedAt: membership.joinedAt ?? '',
    leftAt: membership.leftAt ?? '',
    note: membership.note ?? '',
  }
}

export function ProjectMembershipDialog({
  employeeId,
  open,
  onOpenChange,
  membership,
  assignedProjectIds,
  employeeName,
}: {
  employeeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  membership: EmployeeProjectMembership | null
  /** Ẩn khỏi danh sách chọn (mỗi dự án một dòng). */
  assignedProjectIds: string[]
  /** Mở từ màn "Dự án": khoá ô dự án, hiện tên nhân sự thay vào. */
  employeeName?: string
}) {
  const lockProject = Boolean(employeeName && membership)
  const isEdit = membership !== null
  const form = useZodForm({
    schema: projectMembershipFormSchema,
    defaultValues: toFormValues(membership),
  })
  const { control, handleSubmit, reset, setValue } = form
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const assign = useAssignEmployeeProject(employeeId)
  const update = useUpdateEmployeeProject(employeeId)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (open) reset(toFormValues(membership))
  }, [open, membership, reset])

  const projectOptions = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.id === membership?.projectId ||
          (p.status !== 'COMPLETED' && !assignedProjectIds.includes(p.id))
      ),
    [projects, membership?.projectId, assignedProjectIds]
  )

  const submit = handleSubmit((values) => {
    const input = {
      projectId: values.projectId,
      roleInProject: values.roleInProject || null,
      joinedAt: values.joinedAt || null,
      leftAt: values.leftAt || null,
      note: values.note || null,
    }
    const onSuccess = () => onOpenChange(false)
    if (membership) {
      update.mutate({ membershipId: membership.id, input }, { onSuccess })
    } else {
      assign.mutate(input, { onSuccess })
    }
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Sửa dự án tham gia' : 'Gán dự án'}</DialogTitle>
            <DialogDescription>
              Điền ngày rời dự án khi nhân sự thôi tham gia — dòng này vẫn được giữ làm lịch sử.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.stopPropagation()
                void submit(e)
              }}
            >
              {lockProject ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-semibold text-foreground">{employeeName}</p>
                  <p className="text-xs text-muted-foreground">Dự án: {membership?.projectName}</p>
                </div>
              ) : null}
              <div className={lockProject ? 'hidden' : 'space-y-2'}>
                <SelectController control={control} name="projectId" label="Dự án" required>
                  {/* SelectController dùng '__none' cho giá trị rỗng — item này hiện chữ gợi ý trên trigger. */}
                  <SelectItem value="__none" disabled>
                    {projectsLoading
                      ? 'Đang tải dự án…'
                      : projectOptions.length === 0
                        ? 'Chưa có dự án nào để gán — thêm dự án mới'
                        : 'Chọn dự án'}
                  </SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.status === 'ACTIVE'
                        ? p.name
                        : `${p.name} (${PROJECT_STATUS_LABEL[p.status]})`}
                    </SelectItem>
                  ))}
                </SelectController>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1 px-1 py-0.5 font-semibold text-primary hover:bg-transparent hover:underline"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Thêm dự án mới
                </Button>
              </div>
              {/* Ẩn ô vẫn giữ giá trị cũ trong form → lưu lại không xoá vai trò đã có. */}
              {SHOW_PROJECT_ROLE ? (
                <InputController
                  control={control}
                  name="roleInProject"
                  label="Vai trò trong dự án"
                  autoComplete="off"
                  placeholder="VD: Trưởng dự án, Thành viên"
                />
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateController control={control} name="joinedAt" label="Ngày tham gia" />
                <DateController control={control} name="leftAt" label="Ngày rời dự án" />
              </div>
              <TextareaController control={control} name="note" label="Ghi chú" rows={2} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" loading={assign.isPending || update.isPending}>
                  {isEdit ? 'Lưu' : 'Gán dự án'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(project) =>
          setValue('projectId', project.id, { shouldDirty: true, shouldValidate: true })
        }
      />
    </>
  )
}
