import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function formatViDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return format(d, 'dd/MM/yyyy', { locale: vi })
}
