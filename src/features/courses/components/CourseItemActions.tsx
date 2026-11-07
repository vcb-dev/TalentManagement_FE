import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { ActionMenu, type ActionMenuItem } from '@/components/shared/ActionMenu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Nút admin cho một mục (khoá / lộ trình / tài liệu): lên, xuống, sửa, xoá.
 * Màn hẹp gộp vào menu "⋯" để 4 icon không bóp hẹp tên mục.
 */
export function CourseItemActions({
  index,
  count,
  disabled,
  itemLabel,
  onMove,
  onEdit,
  onDelete,
  className,
}: {
  index: number
  count: number
  disabled?: boolean
  /** Dùng cho aria-label, vd. "lộ trình". */
  itemLabel: string
  onMove: (delta: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
  className?: string
}) {
  const iconButton = 'size-8 rounded-lg'
  const canMove = count > 1
  const menuItems: ActionMenuItem[] = [
    ...(canMove
      ? [
          {
            label: 'Đưa lên trên',
            icon: <ChevronUp className="size-4" />,
            onClick: () => onMove(-1),
            disabled: disabled || index === 0,
          },
          {
            label: 'Đưa xuống dưới',
            icon: <ChevronDown className="size-4" />,
            onClick: () => onMove(1),
            disabled: disabled || index === count - 1,
          },
        ]
      : []),
    { label: 'Sửa', icon: <Pencil className="size-4" />, onClick: onEdit, separator: canMove },
    {
      label: 'Xoá',
      icon: <Trash2 className="size-4 text-danger" />,
      onClick: onDelete,
      variant: 'destructive',
    },
  ]

  return (
    <div className={cn('flex shrink-0 items-center', className)}>
      <ActionMenu
        items={menuItems}
        triggerLabel={`Thao tác với ${itemLabel}`}
        className="sm:hidden"
      />
      <div className="hidden items-center gap-0.5 sm:flex">
        {canMove ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={iconButton}
              disabled={disabled || index === 0}
              aria-label={`Đưa ${itemLabel} lên trên`}
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={iconButton}
              disabled={disabled || index === count - 1}
              aria-label={`Đưa ${itemLabel} xuống dưới`}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="size-4" />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label={`Sửa ${itemLabel}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, 'text-danger hover:text-danger')}
          aria-label={`Xoá ${itemLabel}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
