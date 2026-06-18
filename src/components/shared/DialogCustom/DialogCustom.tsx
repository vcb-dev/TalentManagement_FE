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
}

export function DialogCustom({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogCustomProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
