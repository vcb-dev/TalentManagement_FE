import { useEffect } from 'react'
import { FormProvider, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateController, InputController, TimeController } from '@/components/ui/form-controllers'
import { useZodForm } from '@/lib/forms/useZodForm'
import { useCreateActivity, useUpdateActivity } from '../hooks'
import { activityFormSchema, activityFormToInput, activityFormValues } from '../schemas'
import type { CompanyActivity } from '../types'

/** Control trong modal (Select, vòng focus) theo màu thương hiệu xanh thay vì tím mặc định — như `FormDialog`. */
const DIALOG_CLASS =
  'max-w-lg [--primary:var(--button)] [--ring:var(--button)] dark:[--primary:158_64%_52%] dark:[--ring:158_64%_52%]'

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: CompanyActivity | null
  onSaved?: (activity: CompanyActivity) => void
}) {
  const form = useZodForm({
    schema: activityFormSchema,
    defaultValues: activityFormValues(activity),
  })
  const { control, handleSubmit, reset } = form
  const startDate = useWatch({ control, name: 'startDate' })
  const create = useCreateActivity()
  const update = useUpdateActivity()

  useEffect(() => {
    if (open) reset(activityFormValues(activity))
  }, [open, activity, reset])

  const submit = handleSubmit((values) => {
    const input = activityFormToInput(values)
    const done = {
      onSuccess: (saved: CompanyActivity) => {
        onOpenChange(false)
        onSaved?.(saved)
      },
    }
    if (activity) update.mutate({ id: activity.id, input }, done)
    else create.mutate(input, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{activity ? 'Sửa hoạt động' : 'Thêm hoạt động'}</DialogTitle>
          <DialogDescription>Thay đổi hiển thị ngay với mọi nhân sự.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form className="min-w-0 space-y-4" noValidate onSubmit={(e) => void submit(e)}>
            <InputController
              control={control}
              name="title"
              label="Tên hoạt động"
              required
              autoComplete="off"
              placeholder="VD: Team building tháng 11"
            />
            <InputController
              control={control}
              name="location"
              label="Địa điểm"
              required
              autoComplete="off"
              placeholder="VD: Hội trường tầng 5"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateController control={control} name="startDate" label="Ngày bắt đầu" required />
              <TimeController control={control} name="startTime" label="Giờ bắt đầu" required />
              <DateController
                control={control}
                name="endDate"
                label="Ngày kết thúc"
                placeholder="Cùng ngày bắt đầu"
                min={startDate || undefined}
              />
              <TimeController control={control} name="endTime" label="Giờ kết thúc" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                {activity ? 'Lưu' : 'Thêm hoạt động'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
