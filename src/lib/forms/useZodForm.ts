import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type DefaultValues, type UseFormProps, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

type UseZodFormOptions<TSchema extends z.ZodTypeAny> = Omit<
  UseFormProps<z.infer<TSchema>>,
  'resolver' | 'defaultValues'
> & {
  schema: TSchema
  defaultValues: DefaultValues<z.infer<TSchema>>
}

export function useZodForm<TSchema extends z.ZodTypeAny>({
  schema,
  defaultValues,
  ...rest
}: UseZodFormOptions<TSchema>): UseFormReturn<z.infer<TSchema>> {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    ...rest,
  })
}
