import { Button } from '@/components/ui/button'

export interface RegisterExamButtonProps {
  disabled?: boolean
  onClick?: () => void
}

export function RegisterExamButton({ disabled, onClick }: RegisterExamButtonProps) {
  return (
    <Button type="button" disabled={disabled} onClick={onClick}>
      Đăng ký thi
    </Button>
  )
}
