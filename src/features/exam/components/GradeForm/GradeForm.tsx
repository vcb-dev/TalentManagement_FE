import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GradeFormValues } from './useGradeForm'

export interface GradeFormProps {
  form: UseFormReturn<GradeFormValues>
  onSubmit: (v: GradeFormValues) => void
  isSubmitting?: boolean
}

export function GradeForm({ form, onSubmit, isSubmitting }: GradeFormProps) {
  const { register, handleSubmit } = form
  return (
    <form className="max-w-sm space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label htmlFor="score">Điểm</Label>
        <Input id="score" type="number" {...register('score', { valueAsNumber: true })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="note">Ghi chú</Label>
        <Input id="note" {...register('note')} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Chấm
      </Button>
    </form>
  )
}
