import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog'
export interface DialogCustomProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  descriptionClassName?: string
}

export function DialogCustom({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  descriptionClassName,
}: DialogCustomProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className={descriptionClassName}>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
