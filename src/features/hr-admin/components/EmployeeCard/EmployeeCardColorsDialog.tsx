import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { EmployeeCardColor } from '@/features/hr-admin/employeeCard'
import {
  useCreateEmployeeCardColor,
  useDeleteEmployeeCardColor,
  useEmployeeCardColors,
  useUpdateEmployeeCardColor,
} from '@/features/hr-admin/employeeCardHooks'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

const NAME_MAX_LENGTH = 50

type Draft = { id: string | null; name: string }

const EMPTY_DRAFT: Draft = { id: null, name: '' }

function ColorRow({
  color,
  disabled,
  onEdit,
  onToggleActive,
  onRemove,
}: {
  color: EmployeeCardColor
  disabled: boolean
  onEdit: () => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
        color.isActive
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/20'
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'truncate font-semibold',
              color.isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'
            )}
          >
            {color.name}
          </span>
          {color.isActive ? null : (
            <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
              Đã ẩn
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500">{color.userCount} nhân sự</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          disabled={disabled}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Sửa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          disabled={disabled}
          onClick={onToggleActive}
        >
          {color.isActive ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          )}
          {color.isActive ? 'Ẩn' : 'Hiện'}
        </Button>
        {/* BE từ chối xoá màu đang gán cho nhân sự — chỉ cho ẩn. */}
        {color.userCount === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Xoá
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function EmployeeCardColorsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: colors = [], isLoading } = useEmployeeCardColors(open)
  const create = useCreateEmployeeCardColor()
  const update = useUpdateEmployeeCardColor()
  const remove = useDeleteEmployeeCardColor()
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const pending = create.isPending || update.isPending || remove.isPending

  useEffect(() => {
    if (open) setDraft(EMPTY_DRAFT)
  }, [open])

  const name = draft.name.trim()
  const isEdit = draft.id !== null

  const submit = (e: FormEvent) => {
    // Sự kiện React vẫn nổi qua portal lên form cha — chặn để không submit form hồ sơ.
    e.preventDefault()
    e.stopPropagation()
    if (!name) return
    const onSuccess = () => setDraft(EMPTY_DRAFT)
    if (draft.id) {
      update.mutate({ id: draft.id, input: { name } }, { onSuccess })
    } else {
      create.mutate({ name }, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Màu thẻ nhân viên</DialogTitle>
          <DialogDescription>
            Màu đã ẩn không còn trong danh sách chọn, nhưng người đang mang màu đó vẫn giữ nguyên.
            Chỉ xoá được màu chưa gán cho ai.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : colors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
            Chưa có màu thẻ nào. Thêm màu đầu tiên bên dưới.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {colors.map((c) => (
              <ColorRow
                key={c.id}
                color={c}
                disabled={pending}
                onEdit={() => setDraft({ id: c.id, name: c.name })}
                onToggleActive={() =>
                  update.mutate({ id: c.id, input: { isActive: !c.isActive } })
                }
                onRemove={() =>
                  remove.mutate(c.id, {
                    onSuccess: () => {
                      if (draft.id === c.id) setDraft(EMPTY_DRAFT)
                    },
                  })
                }
              />
            ))}
          </ul>
        )}

        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30"
          noValidate
          onSubmit={submit}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isEdit ? 'Sửa màu' : 'Thêm màu mới'}
          </p>
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Tên màu, VD: Xanh dương"
            aria-label="Tên màu"
            autoComplete="off"
          />
          <div className="flex flex-wrap justify-end gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setDraft(EMPTY_DRAFT)}
              >
                Huỷ sửa
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={!name}
              loading={create.isPending || update.isPending}
            >
              {isEdit ? 'Lưu màu' : 'Thêm màu'}
            </Button>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
