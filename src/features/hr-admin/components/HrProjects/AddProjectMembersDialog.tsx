import { OrgUserAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DateController,
  InputController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { useEmployees } from '@/features/hr-admin/hooks'
import { SHOW_PROJECT_ROLE, type ProjectEntity } from '@/features/hr-admin/projectApi'
import { useAddProjectMembers, useProjectMembers } from '@/features/hr-admin/projectHooks'
import {
  projectMembershipFormSchema,
  type ProjectMembershipForm,
} from '@/features/hr-admin/schemas'
import { useDebounce } from '@/hooks/useDebounce'
import { getVnNow } from '@/hooks/useVnTime'
import { useZodForm } from '@/lib/forms/useZodForm'
import { cn } from '@/lib/utils'
import { Check, Loader2, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'

const PICKER_PAGE_SIZE = 20

function emptyValues(projectId: string): ProjectMembershipForm {
  return { projectId, roleInProject: '', joinedAt: getVnNow().date, leftAt: '', note: '' }
}

function employeeOrgLine(e: EmployeeEntity): string {
  const teams = [...new Set((e.teamNames ?? []).map((t) => t.trim()).filter(Boolean))]
  const dept = e.departmentName?.trim()
  // Nhóm thường trùng tên phòng ban (VD: "Nghiên Cứu Và Phát Triển Sản Phẩm") — chỉ hiện một lần.
  const showDept = dept && !teams.some((t) => t.toLowerCase() === dept.toLowerCase())
  return [teams.join(', '), showDept ? dept : null].filter(Boolean).join(' · ') || e.email
}

/** Nơi dùng render có điều kiện (mount lại mỗi lần mở) nên state luôn bắt đầu trống. */
export function AddProjectMembersDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ProjectEntity
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Kể cả người đã rời — mỗi người một dòng / dự án.
  const { data: members } = useProjectMembers(project.id, open)
  const existingUserIds = useMemo(() => new Set((members ?? []).map((m) => m.userId)), [members])
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query.trim(), 300)
  // Giữ cả object để vẫn hiện tên người đã chọn khi đổi từ khoá tìm kiếm.
  const [selected, setSelected] = useState<EmployeeEntity[]>([])
  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected])
  const [pickError, setPickError] = useState<string | null>(null)
  const form = useZodForm({
    schema: projectMembershipFormSchema,
    defaultValues: emptyValues(project.id),
  })
  const { control, handleSubmit } = form
  const add = useAddProjectMembers(project.id)

  const { data, isFetching } = useEmployees({
    page: 1,
    pageSize: PICKER_PAGE_SIZE,
    search: debouncedQuery || undefined,
  })
  const candidates = (data?.data ?? []).filter((e) => e.status !== 'INACTIVE')

  const toggle = (e: EmployeeEntity) => {
    setSelected((prev) =>
      prev.some((s) => s.id === e.id) ? prev.filter((s) => s.id !== e.id) : [...prev, e]
    )
    setPickError(null)
  }

  const submit = handleSubmit((values) => {
    if (selected.length === 0) {
      setPickError('Chọn ít nhất một nhân sự cần thêm')
      return
    }
    add.mutate(
      {
        userIds: selected.map((e) => e.id),
        ...(SHOW_PROJECT_ROLE ? { roleInProject: values.roleInProject || null } : {}),
        joinedAt: values.joinedAt || null,
        note: values.note || null,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Thêm nhân sự vào dự án</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{project.name}</span> — tick chọn một hoặc
            nhiều người.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          {/* min-w-0: DialogContent là grid — thiếu thì dòng nowrap dài làm modal tràn ngang. */}
          <form
            className="min-w-0 space-y-4"
            noValidate
            onSubmit={(e) => {
              e.stopPropagation()
              void submit(e)
            }}
          >
            <div className="space-y-2">
              <Label
                htmlFor="project-member-search"
                className={cn('text-xs font-semibold', pickError && 'text-destructive')}
              >
                Nhân sự <span className="text-destructive">*</span>
              </Label>
              <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="project-member-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm theo tên hoặc email…"
                      className="pl-9"
                      autoFocus
                      aria-label="Tìm nhân sự"
                    />
                    {isFetching ? (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  <ul
                    className="max-h-56 overflow-y-auto rounded-lg border border-border md:max-h-72"
                    aria-label="Kết quả tìm nhân sự"
                  >
                    {candidates.length === 0 ? (
                      <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {isFetching ? 'Đang tìm…' : 'Không tìm thấy nhân sự phù hợp.'}
                      </li>
                    ) : (
                      candidates.map((e) => {
                        const already = existingUserIds.has(e.id)
                        const checked = selectedIds.has(e.id)
                        return (
                          <li key={e.id} className="border-b border-border/60 last:border-b-0">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              disabled={already}
                              onClick={() => toggle(e)}
                              className={cn(
                                'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                                already
                                  ? 'cursor-not-allowed opacity-50'
                                  : checked
                                    ? 'bg-primary/5 hover:bg-primary/10'
                                    : 'hover:bg-muted/60'
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                                  already
                                    ? 'border-muted-foreground/40 bg-muted text-muted-foreground'
                                    : checked
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-primary'
                                )}
                              >
                                {checked || already ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                ) : null}
                              </span>
                              <OrgUserAvatar
                                name={e.name}
                                avatarUrl={e.avatarUrl}
                                className="h-8 w-8"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{e.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {employeeOrgLine(e)}
                                </span>
                              </span>
                              {already ? (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  Đã trong dự án
                                </span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                  {!debouncedQuery && candidates.length >= PICKER_PAGE_SIZE ? (
                    <p className="text-xs text-muted-foreground">
                      Đang hiện {PICKER_PAGE_SIZE} người gần nhất — gõ tên để tìm thêm.
                    </p>
                  ) : null}
                </div>

                <section
                  aria-label="Nhân sự đã chọn"
                  className="flex min-w-0 flex-col rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">
                      Đã chọn{' '}
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                        {selected.length}
                      </span>
                    </p>
                    {selected.length > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                        onClick={() => setSelected([])}
                      >
                        Bỏ chọn tất cả
                      </button>
                    ) : null}
                  </div>
                  {selected.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground md:my-auto">
                      Chưa chọn ai — tick vào người cần thêm ở danh sách.
                    </p>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto p-1.5 md:max-h-[19rem]">
                      {selected.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60"
                        >
                          <OrgUserAvatar
                            name={e.name}
                            avatarUrl={e.avatarUrl}
                            className="h-6 w-6 text-[10px]"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
                          <button
                            type="button"
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Bỏ chọn ${e.name}`}
                            onClick={() => toggle(e)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
              {pickError ? <p className="text-sm text-destructive">{pickError}</p> : null}
            </div>

            {SHOW_PROJECT_ROLE ? (
              <InputController
                control={control}
                name="roleInProject"
                label="Vai trò trong dự án"
                autoComplete="off"
                placeholder="VD: Trưởng dự án"
              />
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <DateController control={control} name="joinedAt" label="Ngày tham gia" />
              <TextareaController control={control} name="note" label="Ghi chú" rows={2} />
            </div>
            {selected.length > 1 ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                Ngày tham gia và ghi chú áp dụng cho cả {selected.length} người được chọn.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={add.isPending}>
                {selected.length > 0 ? `Thêm ${selected.length} nhân sự` : 'Thêm vào dự án'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
