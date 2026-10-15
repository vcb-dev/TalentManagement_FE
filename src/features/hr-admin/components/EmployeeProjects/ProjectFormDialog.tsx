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
  type ProjectEntity,
  type ProjectStatus,
} from '@/features/hr-admin/projectApi'
import { useCreateProject, useUpdateProject } from '@/features/hr-admin/projectHooks'
import { createProjectFormSchema, type CreateProjectForm } from '@/features/hr-admin/schemas'
import { useZodForm } from '@/lib/forms/useZodForm'
import { useEffect } from 'react'
import { FormProvider } from 'react-hook-form'

function toFormValues(project: ProjectEntity | null | undefined): CreateProjectForm {
  return {
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'ACTIVE',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
  }
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectEntity | null
  onCreated?: (project: ProjectEntity) => void
}) {
  const isEdit = Boolean(project)
  const form = useZodForm({ schema: createProjectFormSchema, defaultValues: toFormValues(project) })
  const { control, handleSubmit, reset } = form
  const create = useCreateProject()
  const update = useUpdateProject()

  useEffect(() => {
    if (open) reset(toFormValues(project))
  }, [open, project, reset])

  const submit = handleSubmit((values) => {
    const input = {
      name: values.name,
      description: values.description || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    }
    if (project) {
      update.mutate(
        { id: project.id, input: { ...input, status: values.status } },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }
    create.mutate(input, {
      onSuccess: (created) => {
        onCreated?.(created)
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa dự án' : 'Thêm dự án mới'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Dự án "Đã kết thúc" không gán thêm được người mới; lịch sử tham gia vẫn được giữ.'
              : 'Dự án mới sẽ có trong danh sách để gán cho nhân sự.'}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          {/* Sự kiện React vẫn nổi qua portal lên form cha — chặn để không submit form ngoài. */}
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.stopPropagation()
              void submit(e)
            }}
          >
            <InputController
              control={control}
              name="name"
              label="Tên dự án"
              required
              autoComplete="off"
              placeholder="VD: Ra mắt ứng dụng Q4"
            />
            <TextareaController control={control} name="description" label="Mô tả" rows={3} />
            {isEdit ? (
              <SelectController control={control} name="status" label="Trạng thái">
                {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectController>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateController control={control} name="startDate" label="Ngày bắt đầu" />
              <DateController control={control} name="endDate" label="Ngày kết thúc" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                {isEdit ? 'Lưu' : 'Tạo dự án'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
