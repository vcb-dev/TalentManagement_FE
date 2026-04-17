import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { InputController } from '@/components/ui/form-controllers'
import type { GradeFormValues } from './useGradeForm'

export interface GradeFormProps {
  form: UseFormReturn<GradeFormValues>
  onSubmit: (v: GradeFormValues) => void
  isSubmitting?: boolean
}

export function GradeForm({ form, onSubmit, isSubmitting }: GradeFormProps) {
  const { control, handleSubmit } = form
  return (
    <Form {...form}>
      <form className="max-w-sm space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <InputController
          control={control}
          name="score"
          label="Điểm"
          type="number"
          valueMode="number"
          min={0}
          max={100}
        />
        <InputController control={control} name="note" label="Ghi chú" />
        <Button type="submit" disabled={isSubmitting}>
          Chấm
        </Button>
      </form>
    </Form>
  )
}
