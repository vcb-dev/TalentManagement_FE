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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  POSITION_LINKABLE_ROLES,
  type EmployeePosition,
  type PositionLinkedRole,
} from '@/features/hr-admin/employeePosition'
import {
  useCreateEmployeePosition,
  useDeleteEmployeePosition,
  useEmployeePositions,
  useUpdateEmployeePosition,
} from '@/features/hr-admin/employeePositionHooks'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

const NAME_MAX_LENGTH = 60

type Draft = { id: string | null; name: string; linkedRole: PositionLinkedRole }

const EMPTY_DRAFT: Draft = { id: null, name: '', linkedRole: 'MEMBER' }

function PositionRow({
  position,
  disabled,
  onEdit,
  onToggleActive,
  onRemove,
}: {
  position: EmployeePosition
  disabled: boolean
  onEdit: () => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
        position.isActive
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/20'
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'truncate font-semibold',
              position.isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'
            )}
          >
            {position.name}
          </span>
          {position.isActive ? null : (
            <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
              Đã ẩn
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Quyền: {ROLE_LABEL_VI[position.linkedRole]} · {position.userCount} nhân sự
        </p>
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
          {position.isActive ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          )}
          {position.isActive ? 'Ẩn' : 'Hiện'}
        </Button>
        {/* BE từ chối xoá chức vụ đang gán cho nhân sự — chỉ cho ẩn. */}
        {position.userCount === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-danger hover:text-danger"
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

export function EmployeePositionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: positions = [], isLoading } = useEmployeePositions(open)
  const create = useCreateEmployeePosition()
  const update = useUpdateEmployeePosition()
  const remove = useDeleteEmployeePosition()
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
    const input = { name, linkedRole: draft.linkedRole }
    if (draft.id) {
      update.mutate({ id: draft.id, input }, { onSuccess })
    } else {
      create.mutate(input, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Danh mục chức vụ</DialogTitle>
          <DialogDescription>
            Chọn chức vụ trên hồ sơ sẽ đổi quyền của nhân sự theo vai trò đi kèm. Đổi vai trò của
            một chức vụ chỉ áp cho lần gán sau, không đổi quyền người đang giữ. Chức vụ đã ẩn không
            còn trong danh sách chọn; chỉ xoá được chức vụ chưa gán cho ai.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : positions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
            Chưa có chức vụ nào. Thêm chức vụ đầu tiên bên dưới.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {positions.map((p) => (
              <PositionRow
                key={p.id}
                position={p}
                disabled={pending}
                onEdit={() => setDraft({ id: p.id, name: p.name, linkedRole: p.linkedRole })}
                onToggleActive={() => update.mutate({ id: p.id, input: { isActive: !p.isActive } })}
                onRemove={() =>
                  remove.mutate(p.id, {
                    onSuccess: () => {
                      if (draft.id === p.id) setDraft(EMPTY_DRAFT)
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
            {isEdit ? 'Sửa chức vụ' : 'Thêm chức vụ mới'}
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              maxLength={NAME_MAX_LENGTH}
              placeholder="Tên chức vụ, VD: Phó giám đốc"
              aria-label="Tên chức vụ"
              autoComplete="off"
            />
            <Select
              value={draft.linkedRole}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, linkedRole: v as PositionLinkedRole }))
              }
            >
              <SelectTrigger aria-label="Quyền đi kèm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_LINKABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    Quyền: {ROLE_LABEL_VI[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              {isEdit ? 'Lưu chức vụ' : 'Thêm chức vụ'}
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
