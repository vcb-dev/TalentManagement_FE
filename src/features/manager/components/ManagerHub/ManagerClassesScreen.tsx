import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Form } from '@/components/ui/form'
import { DateController, InputController, SelectController } from '@/components/ui/form-controllers'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SelectItem } from '@/components/ui/select'
import { EditorClassesSection } from '@/features/editor-classes/components/EditorClassesSection'
import {
  useClassMemberOptions,
  useCreateManagerClass,
  useDeleteManagerClass,
  useManagerClasses,
  useTeacherOptions,
  useUpdateManagerClass,
} from '@/features/manager/hooks'
import { usePermission } from '@/hooks/usePermission'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import type { ManagerClass } from '@/features/manager/types'
import {
  BookOpen,
  Calendar,
  CalendarRange,
  FilterX,
  GraduationCap,
  Loader2,
  PlusCircle,
  Search,
  UserPlus2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ClassCard } from './ClassCard'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const LEVEL_LABELS: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

type CreateLevel = 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong'

type ClassFormValues = {
  name: string
  levelFrom: CreateLevel
  isKnowledgeWork: boolean
  startDate: string
  endDate: string
}

const LEVEL_FLOW_OPTIONS: Array<{ value: CreateLevel; label: string }> = [
  { value: 'tap_su', label: 'Tập sự' },
  { value: 'biet_viec', label: 'Biết việc' },
  { value: 'duoc_viec', label: 'Được việc' },
  { value: 'dong_gop_ket_qua', label: 'Đóng góp kết quả' },
  { value: 'tuong', label: 'Tướng' },
]

const NEXT_LEVEL_BY_FROM: Record<CreateLevel, CreateLevel> = {
  tap_su: 'biet_viec',
  biet_viec: 'duoc_viec',
  duoc_viec: 'dong_gop_ket_qua',
  dong_gop_ket_qua: 'tuong',
  tuong: 'tuong',
}

/** Lớp học khác không theo cấp — lưu trọn dải Tập sự → Tướng. */
const OTHER_CLASS_LEVELS = { levelFrom: 'tap_su', levelTo: 'tuong' } as const

export type ClassTab = 'knowledge' | 'other'

const CLASS_TABS: Array<{ value: ClassTab; label: string; icon: typeof GraduationCap }> = [
  { value: 'knowledge', label: 'Lớp học tri thức', icon: GraduationCap },
  { value: 'other', label: 'Lớp học khác', icon: BookOpen },
]

type StatusFilter = 'all' | 'open' | 'closed'

/** "Đang mở" gộp cả lớp `full` — BE vẫn coi `full` là lớp đang hoạt động (nhận đăng ký). */
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'open', label: 'Đang mở' },
  { value: 'closed', label: 'Đã đóng' },
]

function matchesStatus(row: ManagerClass, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  return filter === 'closed' ? row.status === 'closed' : row.status !== 'closed'
}

/** Lớp cũ chưa có ngày bắt đầu dùng ngày tạo; thiếu ngày kết thúc nghĩa là còn tiếp tục. */
function effectiveClassPeriod(row: ManagerClass): {
  startDate: string | null
  endDate: string | null
} {
  return {
    startDate: row.startDate ?? row.createdAt.slice(0, 10),
    endDate: row.endDate ?? null,
  }
}

function matchesClassPeriod(row: ManagerClass, fromDate: string, toDate: string): boolean {
  if (!fromDate && !toDate) return true
  const period = effectiveClassPeriod(row)
  if (!period.startDate && !period.endDate) return false
  if (fromDate && period.endDate && period.endDate < fromDate) return false
  if (toDate && period.startDate && period.startDate > toDate) return false
  return true
}

function formatFilterDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const CLASS_TYPE_OPTIONS = [
  {
    isKnowledgeWork: true,
    label: 'Lớp học tri thức',
    hint: 'Theo cấp lộ trình. Mỗi nhân sự chỉ học 1 lớp tri thức tại một thời điểm.',
    icon: GraduationCap,
  },
  {
    isKnowledgeWork: false,
    label: 'Lớp học khác',
    hint: 'Không theo cấp. Nhân sự nào cũng đăng ký được, không giới hạn số lớp.',
    icon: BookOpen,
  },
] as const

function ClassTypeField({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: boolean
  onChange: (isKnowledgeWork: boolean) => void
}) {
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        Loại lớp học
      </legend>
      <RadioGroup
        value={value ? 'knowledge' : 'other'}
        onValueChange={(v) => onChange(v === 'knowledge')}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {CLASS_TYPE_OPTIONS.map((opt) => {
          const selected = opt.isKnowledgeWork === value
          const id = `${idPrefix}-${opt.isKnowledgeWork ? 'knowledge' : 'other'}`
          const Icon = opt.icon
          return (
            <label
              key={id}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                selected
                  ? 'border-button bg-button/5 ring-1 ring-button/25'
                  : 'border-border hover:border-button/40 hover:bg-muted/40'
              )}
            >
              <RadioGroupItem
                id={id}
                value={opt.isKnowledgeWork ? 'knowledge' : 'other'}
                className="mt-0.5 border-button text-button focus-visible:ring-button/35"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Icon className="size-4 text-button" aria-hidden />
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {opt.hint}
                </span>
              </span>
            </label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}

function ClassGrid({
  rows,
  emptyTitle,
  emptyHint,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  rows: ManagerClass[]
  emptyTitle: string
  emptyHint: string | null
  onEdit?: (row: ManagerClass) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (row: ManagerClass) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-semibold text-muted-foreground">{emptyTitle}</p>
        {emptyHint ? <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p> : null}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <ClassCard
          key={row.id}
          row={row}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  )
}

export function ManagerClassesScreen({
  tab,
  onTabChange,
}: {
  tab: ClassTab
  onTabChange: (tab: ClassTab) => void
}) {
  const { canId } = usePermission()
  /** Không có `manager.classes` (vd. HR chỉ có `hr.classes.view`) → chỉ xem, ẩn tạo/sửa/xoá. */
  const canManage = canId('manager.classes')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createMemberQuery, setCreateMemberQuery] = useState('')
  const [debouncedCreateMemberQuery, setDebouncedCreateMemberQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCreateMemberQuery(createMemberQuery), 500)
    return () => clearTimeout(t)
  }, [createMemberQuery])

  const [selectedCreateMembers, setSelectedCreateMembers] = useState<
    Array<{ userId: string; name: string; email: string }>
  >([])

  const [createTeacherQuery, setCreateTeacherQuery] = useState('')
  const [debouncedCreateTeacherQuery, setDebouncedCreateTeacherQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCreateTeacherQuery(createTeacherQuery), 500)
    return () => clearTimeout(t)
  }, [createTeacherQuery])

  const [selectedCreateTeacher, setSelectedCreateTeacher] = useState<{
    userId: string
    name: string
    email: string
  } | null>(null)

  const [editClassId, setEditClassId] = useState<string | null>(null)
  const [editModalTeacherQuery, setEditModalTeacherQuery] = useState('')
  const [debouncedEditModalTeacherQuery, setDebouncedEditModalTeacherQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEditModalTeacherQuery(editModalTeacherQuery), 500)
    return () => clearTimeout(t)
  }, [editModalTeacherQuery])

  const [selectedTeacher, setSelectedTeacher] = useState<{
    userId: string
    name: string
    email: string
  } | null>(null)

  const createForm = useForm<ClassFormValues>({
    defaultValues: {
      name: '',
      levelFrom: 'tap_su',
      isKnowledgeWork: true,
      startDate: '',
      endDate: '',
    },
  })
  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
  } = createForm
  const createLevelFrom = useWatch({ control: createControl, name: 'levelFrom' }) ?? 'tap_su'
  const createIsKnowledgeWork = useWatch({ control: createControl, name: 'isKnowledgeWork' })
  const createStartDate = useWatch({ control: createControl, name: 'startDate' })
  const createEndDate = useWatch({ control: createControl, name: 'endDate' })

  const editForm = useForm<ClassFormValues>({
    defaultValues: {
      name: '',
      isKnowledgeWork: true,
      levelFrom: 'tap_su',
      startDate: '',
      endDate: '',
    },
  })
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEditForm } = editForm
  const editIsKnowledgeWork = useWatch({ control: editControl, name: 'isKnowledgeWork' })
  const editLevelFrom = useWatch({ control: editControl, name: 'levelFrom' }) ?? 'tap_su'
  const editStartDate = useWatch({ control: editControl, name: 'startDate' })
  const editEndDate = useWatch({ control: editControl, name: 'endDate' })

  const [deleteClassId, setDeleteClassId] = useState<string | null>(null)
  // Giữ target sau khi đóng hộp thoại để tiêu đề không nháy rỗng lúc animation thoát.
  const [closeClassTarget, setCloseClassTarget] = useState<ManagerClass | null>(null)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)

  const { data: rows = [], isLoading, isError, error } = useManagerClasses({ search })
  const createClass = useCreateManagerClass()
  const deleteClass = useDeleteManagerClass()
  const updateClass = useUpdateManagerClass()

  const { data: createMemberOptions = [], isFetching: fetchingCreateOptions } =
    useClassMemberOptions(debouncedCreateMemberQuery, undefined, selectedCreateTeacher?.userId)
  const { data: createTeacherOptions = [], isFetching: fetchingCreateTeacherOptions } =
    useTeacherOptions(debouncedCreateTeacherQuery)
  const { data: editModalTeacherOptions = [], isFetching: fetchingEditModalTeacherOptions } =
    useTeacherOptions(debouncedEditModalTeacherQuery)

  useEffect(() => {
    if (!isCreateOpen && !editClassId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isCreateOpen, editClassId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-dropdown-container')) {
        if (!selectedCreateTeacher) setCreateTeacherQuery('')
        setCreateMemberQuery('')
        if (!selectedTeacher) setEditModalTeacherQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCreateTeacher, selectedTeacher])

  const rowsInPeriod = rows.filter((row) => matchesClassPeriod(row, fromDate, toDate))
  const knowledgeRows = rowsInPeriod.filter((r) => r.isKnowledgeWork !== false)
  const otherRows = rowsInPeriod.filter((r) => r.isKnowledgeWork === false)
  const tabRows = tab === 'other' ? otherRows : knowledgeRows
  // Lớp Editor do hệ thống đồng bộ theo team — tách khu riêng trong tab "Lớp học khác".
  const otherRegularRows = otherRows.filter((r) => r.kind !== 'EDITOR')
  const editorRows = otherRows.filter((r) => r.kind === 'EDITOR')
  const totalMembers = tabRows.reduce((a, r) => a + r.memberCount, 0)
  const openCount = tabRows.filter((r) => matchesStatus(r, 'open')).length
  // Thống kê phía trên giữ theo cả tab; bộ lọc trạng thái chỉ áp cho lưới lớp + số đếm tab.
  const byStatus = (list: ManagerClass[]) => list.filter((r) => matchesStatus(r, statusFilter))
  const hasTimeFilter = Boolean(fromDate || toDate)
  const isFiltering = search.trim() !== '' || statusFilter !== 'all' || hasTimeFilter
  const timeFilterLabel =
    fromDate && toDate
      ? `${formatFilterDate(fromDate)} – ${formatFilterDate(toDate)}`
      : fromDate
        ? `Từ ${formatFilterDate(fromDate)}`
        : toDate
          ? `Đến ${formatFilterDate(toDate)}`
          : 'Thời gian'

  const openCreateModal = () => {
    resetCreateForm({
      name: '',
      levelFrom: 'tap_su',
      isKnowledgeWork: tab === 'knowledge',
      startDate: '',
      endDate: '',
    })
    setIsCreateOpen(true)
  }

  const onCreate = handleCreateSubmit((values) => {
    const n = values.name.trim()
    if (n.length < 3) {
      toast.error('Tên lớp ít nhất 3 ký tự')
      return
    }
    if (!values.startDate) {
      toast.error('Vui lòng chọn ngày bắt đầu lớp')
      return
    }
    if (values.endDate && values.endDate < values.startDate) {
      toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu')
      return
    }
    createClass.mutate(
      {
        name: n,
        ...(values.isKnowledgeWork
          ? { levelFrom: values.levelFrom, levelTo: NEXT_LEVEL_BY_FROM[values.levelFrom] }
          : OTHER_CLASS_LEVELS),
        status: 'open',
        startDate: values.startDate,
        endDate: values.endDate || null,
        memberUserIds: [],
        teacherUserId: selectedCreateTeacher?.userId ?? null,
        isKnowledgeWork: values.isKnowledgeWork,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          setCreateMemberQuery('')
          setSelectedCreateMembers([])
          setCreateTeacherQuery('')
          setSelectedCreateTeacher(null)
          // Lớp vừa tạo khác loại với tab đang xem → chuyển tab để thấy ngay.
          onTabChange(values.isKnowledgeWork ? 'knowledge' : 'other')
        },
      }
    )
  })

  const closeEditClassModal = () => {
    setEditClassId(null)
    resetEditForm({
      name: '',
      levelFrom: 'tap_su',
      isKnowledgeWork: true,
      startDate: '',
      endDate: '',
    })
    setEditModalTeacherQuery('')
    setSelectedTeacher(null)
  }

  const openEditClassModal = (row: ManagerClass) => {
    setEditClassId(row.id)
    resetEditForm({
      name: row.name,
      isKnowledgeWork: row.isKnowledgeWork ?? true,
      // Lớp học khác lưu Tập sự → Tướng; khi đổi sang tri thức thì mặc định Tập sự.
      levelFrom: row.levelFrom === 'tuong' ? 'tap_su' : row.levelFrom,
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
    })
    setSelectedTeacher(row.teacher ?? null)
    setEditModalTeacherQuery('')
  }

  const saveEditClass = handleEditSubmit((values) => {
    if (!editClassId) return
    const n = values.name.trim()
    if (n.length < 3) {
      toast.error('Tên lớp ít nhất 3 ký tự')
      return
    }
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu')
      return
    }
    updateClass.mutate(
      {
        classId: editClassId,
        input: {
          name: n,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          teacherUserId: selectedTeacher?.userId ?? null,
          isKnowledgeWork: values.isKnowledgeWork,
          ...(values.isKnowledgeWork
            ? { levelFrom: values.levelFrom, levelTo: NEXT_LEVEL_BY_FROM[values.levelFrom] }
            : OTHER_CLASS_LEVELS),
        },
      },
      {
        onSuccess: () => {
          closeEditClassModal()
        },
      }
    )
  })

  const handleDeleteClass = (id: string) => {
    setDeleteClassId(id)
  }

  // Đóng lớp cần xác nhận; mở lại thì cập nhật luôn.
  const handleToggleStatus = (row: ManagerClass) => {
    if (row.status === 'closed') {
      updateClass.mutate({ classId: row.id, input: { status: 'open' } })
      return
    }
    setCloseClassTarget(row)
    setIsCloseConfirmOpen(true)
  }

  return (
    <>
      <ManagerScreenLayout hideHubNav hideToolbar>
        <div className="mb-8 flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Quản lý lớp học</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Theo dõi thời gian hoạt động, trạng thái và sĩ số từng lớp.
                </p>
              </div>
              <div
                className="flex w-fit flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm ring-1 ring-border/60"
                role="tablist"
                aria-label="Loại lớp học"
              >
                {CLASS_TABS.map((t) => {
                  const selected = tab === t.value
                  const count = byStatus(t.value === 'other' ? otherRows : knowledgeRows).length
                  const Icon = t.icon
                  return (
                    <Button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      variant={selected ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm',
                        !selected && 'text-muted-foreground'
                      )}
                      onClick={() => onTabChange(t.value)}
                    >
                      <Icon className="size-4" aria-hidden />
                      {t.label}
                      {!isLoading ? (
                        <span
                          className={cn(
                            'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                            selected ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className={cn(
                'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
                <Users className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Lớp đang mở
                </div>
                <div className="text-2xl font-bold text-foreground">{openCount}</div>
              </div>
            </div>
            <div
              className={cn(
                'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <UserPlus2 className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Tổng học viên
                </div>
                <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
              </div>
            </div>
            <div
              className={cn(
                'flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Calendar className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {hasTimeFilter ? 'Lớp trong khoảng' : 'Tổng lớp'}
                </div>
                <div className="text-2xl font-bold text-foreground">{tabRows.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="group relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                strokeWidth={2}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'other'
                    ? 'Tìm theo tên lớp, ví dụ: Lớp đào tạo cán bộ nguồn'
                    : 'Tìm theo tên lớp, ví dụ: Tập sự — Đợt Q2/2026'
                }
                className="h-auto w-full rounded-xl border border-transparent bg-muted/80 py-3 pl-11 pr-4 text-sm shadow-inner shadow-none outline-none ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <Popover open={isTimeFilterOpen} onOpenChange={setIsTimeFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={isTimeFilterOpen}
                  aria-label={
                    hasTimeFilter ? `Thời gian lớp: ${timeFilterLabel}` : 'Lọc thời gian lớp'
                  }
                  className={cn(
                    'h-auto min-h-11 w-full min-w-0 justify-between gap-2 rounded-xl border-border/80 bg-card/90 px-3 text-sm font-semibold shadow-sm ring-1 ring-border/60 sm:w-auto lg:max-w-56',
                    (isTimeFilterOpen || hasTimeFilter) &&
                      'border-button/40 bg-button/10 text-button ring-button/20 hover:bg-button/15 hover:text-button'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CalendarRange className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{timeFilterLabel}</span>
                  </span>
                  {hasTimeFilter ? (
                    <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-button px-1.5 text-xs font-bold leading-5 text-white">
                      1
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[min(24rem,calc(100vw-2rem))] p-0"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Thời gian lớp</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Lọc theo khoảng hoạt động của lớp
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-mr-2 h-8 shrink-0 gap-1.5 px-2 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    disabled={!hasTimeFilter}
                    onClick={() => {
                      setFromDate('')
                      setToDate('')
                    }}
                  >
                    <FilterX className="size-3.5" aria-hidden />
                    Đặt lại
                  </Button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Từ ngày</p>
                      <DatePicker
                        value={fromDate}
                        onChange={setFromDate}
                        max={toDate || undefined}
                        placeholder="Chọn ngày"
                        size="toolbar"
                        className="h-10 rounded-lg border-border bg-background text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Đến ngày</p>
                      <DatePicker
                        value={toDate}
                        onChange={setToDate}
                        min={fromDate || undefined}
                        placeholder="Chọn ngày"
                        size="toolbar"
                        className="h-10 rounded-lg border-border bg-background text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Hiển thị lớp có thời gian hoạt động giao với khoảng ngày đã chọn.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
            <div
              className="flex w-full shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm ring-1 ring-border/60 sm:w-fit"
              role="group"
              aria-label="Lọc theo trạng thái lớp"
            >
              {STATUS_FILTERS.map((f) => {
                const selected = statusFilter === f.value
                return (
                  <Button
                    key={f.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={selected}
                    className={cn(
                      'h-full min-h-9 rounded-lg px-3 text-xs font-semibold sm:text-sm',
                      selected
                        ? 'bg-button/10 text-button hover:bg-button/15 hover:text-button'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                    {!isLoading ? (
                      <span
                        className={cn(
                          'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                          selected ? 'bg-button/15' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {tabRows.filter((r) => matchesStatus(r, f.value)).length}
                      </span>
                    ) : null}
                  </Button>
                )
              })}
            </div>
            {canManage ? (
              <Button
                type="button"
                className="shrink-0 gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-md"
                onClick={openCreateModal}
              >
                <PlusCircle className="h-4 w-4" strokeWidth={2} />
                Tạo lớp
              </Button>
            ) : null}
          </div>
        </div>

        {canManage &&
          isCreateOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-class-modal-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/35 backdrop-blur-sm"
                aria-label="Đóng"
                onClick={() => setIsCreateOpen(false)}
              />
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-10 my-auto w-full max-w-2xl max-h-[min(90vh,800px)] overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 id="create-class-modal-title" className="text-lg font-bold text-foreground">
                      Tạo lớp học mới
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Form {...createForm}>
                    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onCreate}>
                      <Controller
                        control={createControl}
                        name="isKnowledgeWork"
                        render={({ field }) => (
                          <ClassTypeField
                            idPrefix="create-class-type"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      <InputController
                        control={createControl}
                        name="name"
                        label="Tên lớp"
                        required
                        placeholder={
                          createIsKnowledgeWork
                            ? 'Ví dụ: Tập sự — Đợt Q2/2026'
                            : 'Ví dụ: Lớp đào tạo cán bộ nguồn'
                        }
                        className="md:col-span-2"
                      />
                      <DateController
                        control={createControl}
                        name="startDate"
                        label="Ngày bắt đầu"
                        required
                        rules={{ required: 'Vui lòng chọn ngày bắt đầu lớp' }}
                        max={createEndDate || undefined}
                        placeholder="Chọn ngày bắt đầu"
                        datePickerClassName="h-11 rounded-xl border-border bg-background font-medium shadow-none"
                      />
                      <DateController
                        control={createControl}
                        name="endDate"
                        label="Ngày kết thúc"
                        min={createStartDate || undefined}
                        placeholder="Chưa xác định"
                        datePickerClassName="h-11 rounded-xl border-border bg-background font-medium shadow-none"
                      />
                      <p className="-mt-1 text-xs leading-relaxed text-muted-foreground md:col-span-2">
                        Ngày kết thúc có thể để trống nếu lớp chưa xác định thời điểm đóng.
                      </p>
                      {createIsKnowledgeWork ? (
                        <>
                          <SelectController
                            control={createControl}
                            name="levelFrom"
                            label="Cấp lớp"
                            required
                          >
                            {LEVEL_FLOW_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectController>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                              Lộ trình
                            </label>
                            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground">
                              {LEVEL_LABELS[createLevelFrom]} →{' '}
                              {LEVEL_LABELS[NEXT_LEVEL_BY_FROM[createLevelFrom]]}
                            </div>
                          </div>
                        </>
                      ) : null}
                      <div className="search-dropdown-container relative md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Giáo viên phụ trách lớp
                        </label>
                        <Input
                          value={
                            selectedCreateTeacher ? selectedCreateTeacher.name : createTeacherQuery
                          }
                          onChange={(e) => {
                            setCreateTeacherQuery(e.target.value)
                            if (selectedCreateTeacher) setSelectedCreateTeacher(null)
                          }}
                          placeholder="Gõ tên/email giáo viên..."
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                        />
                        {!selectedCreateTeacher && createTeacherQuery.trim().length > 0 && (
                          <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                            {fetchingCreateTeacherOptions ? (
                              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tìm...
                              </div>
                            ) : createTeacherOptions.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-muted-foreground">
                                Không có kết quả
                              </div>
                            ) : (
                              createTeacherOptions.map((opt) => (
                                <Button
                                  key={opt.userId}
                                  type="button"
                                  variant="ghost"
                                  className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal"
                                  onMouseDown={() => {
                                    setSelectedCreateTeacher(opt)
                                    setCreateTeacherQuery('')
                                  }}
                                >
                                  <p className="font-semibold text-foreground">{opt.name}</p>
                                  <p className="text-muted-foreground">{opt.email}</p>
                                </Button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {false ? (
                        <>
                          <div className="search-dropdown-container relative md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                              Thêm nhân sự cho lớp (theo cấp đã chọn)
                            </label>
                            <div className="relative">
                              <Input
                                value={createMemberQuery}
                                onChange={(e) => setCreateMemberQuery(e.target.value)}
                                placeholder="Gõ tên/email để tìm nhân sự..."
                                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                              />
                              {createMemberQuery.trim().length > 0 && (
                                <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                                  {fetchingCreateOptions ? (
                                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Đang tìm...
                                    </div>
                                  ) : createMemberOptions.filter(
                                      (opt) =>
                                        !selectedCreateMembers.some(
                                          (m) => m.userId === opt.userId
                                        ) && opt.userId !== selectedCreateTeacher?.userId
                                    ).length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-muted-foreground">
                                      Không có kết quả phù hợp
                                    </div>
                                  ) : (
                                    createMemberOptions
                                      .filter(
                                        (opt) =>
                                          !selectedCreateMembers.some(
                                            (m) => m.userId === opt.userId
                                          ) && opt.userId !== selectedCreateTeacher?.userId
                                      )
                                      .map((opt) => (
                                        <Button
                                          key={opt.userId}
                                          type="button"
                                          variant="ghost"
                                          className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                                          onMouseDown={() => {
                                            setSelectedCreateMembers((prev) => [...prev, opt])
                                            setCreateMemberQuery('')
                                          }}
                                        >
                                          <p className="font-semibold text-foreground">
                                            {opt.name}
                                          </p>
                                          <p className="text-muted-foreground">{opt.email}</p>
                                        </Button>
                                      ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <p className="mb-1 text-xs font-semibold text-muted-foreground">
                              Nhân sự đã chọn ({selectedCreateMembers.length})
                            </p>
                            {selectedCreateMembers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Chưa chọn nhân sự nào.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {selectedCreateMembers.map((m) => (
                                  <span
                                    key={m.userId}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                                  >
                                    {m.name}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 min-h-0 shrink-0 rounded p-0.5 hover:bg-primary/20"
                                      onClick={() =>
                                        setSelectedCreateMembers((prev) =>
                                          prev.filter((x) => x.userId !== m.userId)
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : null}
                      <div className="rounded-xl border border-dashed border-button/25 bg-button/5 px-3 py-2.5 text-xs font-semibold text-button md:col-span-2">
                        Học viên sẽ tự đăng ký lớp sau khi lớp được tạo. Giáo viên phụ trách duyệt
                        hoặc từ chối từng đăng ký.
                      </div>
                      <div className="mt-5 flex justify-end gap-2 md:col-span-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                          disabled={createClass.isPending}
                        >
                          Hủy
                        </Button>
                        <Button
                          type="submit"
                          className="gap-2 font-bold"
                          disabled={createClass.isPending}
                        >
                          Tạo lớp
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>,
            document.body
          )}

        {isError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-semibold">Không thể tải danh sách lớp</p>
            <p className="mt-1 text-xs opacity-80">
              {error instanceof Error
                ? error.message
                : 'Lỗi không xác định. Kiểm tra quyền truy cập hoặc kết nối mạng.'}
            </p>
          </div>
        )}

        {isLoading && !isError && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tải danh sách lớp...</span>
          </div>
        )}

        {!isLoading && !isError ? (
          tab === 'knowledge' ? (
            <ClassGrid
              rows={byStatus(knowledgeRows)}
              emptyTitle={
                isFiltering
                  ? 'Không có lớp tri thức nào khớp tìm kiếm / bộ lọc'
                  : 'Chưa có lớp học tri thức'
              }
              emptyHint={canManage && !isFiltering ? 'Nhấn "Tạo lớp" để tạo lớp đầu tiên.' : null}
              onEdit={canManage ? openEditClassModal : undefined}
              onDelete={canManage ? handleDeleteClass : undefined}
              onToggleStatus={canManage ? handleToggleStatus : undefined}
            />
          ) : (
            <div className="space-y-10">
              <ClassGrid
                rows={byStatus(otherRegularRows)}
                emptyTitle={
                  isFiltering
                    ? 'Không có lớp học khác nào khớp tìm kiếm / bộ lọc'
                    : 'Chưa có lớp học khác'
                }
                emptyHint={
                  canManage && !isFiltering
                    ? 'Nhấn "Tạo lớp" và chọn loại "Lớp học khác" — lớp không theo cấp, ai cũng đăng ký được.'
                    : null
                }
                onEdit={canManage ? openEditClassModal : undefined}
                onDelete={canManage ? handleDeleteClass : undefined}
                onToggleStatus={canManage ? handleToggleStatus : undefined}
              />
              {canManage || editorRows.length > 0 ? (
                <div className="border-t border-border/70 pt-8">
                  <EditorClassesSection canManage={canManage}>
                    {/* Không cho đóng/mở tay: "Đồng bộ lớp Editor" tự đóng lớp hết editor và mở lại khi có. */}
                    <ClassGrid
                      rows={byStatus(editorRows)}
                      emptyTitle={
                        editorRows.length > 0
                          ? 'Không có lớp Editor nào khớp bộ lọc'
                          : 'Chưa có lớp Editor nào'
                      }
                      emptyHint={
                        canManage && editorRows.length === 0
                          ? 'Bấm "Đồng bộ lớp Editor" để tự động tạo lớp theo team đang có editor.'
                          : null
                      }
                      onEdit={canManage ? openEditClassModal : undefined}
                      onDelete={canManage ? handleDeleteClass : undefined}
                    />
                  </EditorClassesSection>
                </div>
              ) : null}
            </div>
          )
        ) : null}

        {canManage &&
          editClassId &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-class-modal-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/35 backdrop-blur-sm"
                aria-label="Đóng"
                onClick={closeEditClassModal}
              />
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  className="relative z-10 my-auto w-full max-w-xl max-h-[min(90vh,800px)] overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 id="edit-class-modal-title" className="text-lg font-bold text-foreground">
                      Chỉnh sửa lớp học
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded p-1 text-muted-foreground hover:bg-muted"
                      onClick={closeEditClassModal}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Form {...editForm}>
                    <form className="space-y-4" onSubmit={saveEditClass}>
                      <InputController control={editControl} name="name" label="Tên lớp" required />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DateController
                          control={editControl}
                          name="startDate"
                          label="Ngày bắt đầu"
                          max={editEndDate || undefined}
                          placeholder="Chưa cập nhật"
                          datePickerClassName="h-11 rounded-xl border-border bg-background font-medium shadow-none"
                        />
                        <DateController
                          control={editControl}
                          name="endDate"
                          label="Ngày kết thúc"
                          min={editStartDate || undefined}
                          placeholder="Chưa xác định"
                          datePickerClassName="h-11 rounded-xl border-border bg-background font-medium shadow-none"
                        />
                      </div>
                      <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
                        Khoảng thời gian này dùng để xác định lớp xuất hiện trong kỳ thống kê.
                      </p>
                      <div className="search-dropdown-container relative">
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Giáo viên phụ trách
                        </label>
                        <Input
                          value={selectedTeacher ? selectedTeacher.name : editModalTeacherQuery}
                          onChange={(e) => {
                            setEditModalTeacherQuery(e.target.value)
                            if (selectedTeacher) setSelectedTeacher(null)
                          }}
                          placeholder="Gõ tên/email để đổi giáo viên..."
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                        />
                        {!selectedTeacher && editModalTeacherQuery.trim().length > 0 && (
                          <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                            {fetchingEditModalTeacherOptions ? (
                              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tìm...
                              </div>
                            ) : editModalTeacherOptions.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-muted-foreground">
                                Không có kết quả
                              </div>
                            ) : (
                              editModalTeacherOptions.map((opt) => (
                                <Button
                                  key={opt.userId}
                                  type="button"
                                  variant="ghost"
                                  className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal"
                                  onMouseDown={() => {
                                    setSelectedTeacher(opt)
                                    setEditModalTeacherQuery('')
                                  }}
                                >
                                  <p className="font-semibold text-foreground">{opt.name}</p>
                                  <p className="text-muted-foreground">{opt.email}</p>
                                </Button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <Controller
                        control={editControl}
                        name="isKnowledgeWork"
                        render={({ field }) => (
                          <ClassTypeField
                            idPrefix="edit-class-type"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      {editIsKnowledgeWork ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <SelectController
                            control={editControl}
                            name="levelFrom"
                            label="Cấp lớp"
                            required
                          >
                            {LEVEL_FLOW_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectController>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                              Lộ trình
                            </label>
                            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground">
                              {LEVEL_LABELS[editLevelFrom]} →{' '}
                              {LEVEL_LABELS[NEXT_LEVEL_BY_FROM[editLevelFrom]]}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-5 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={closeEditClassModal}
                        >
                          Hủy
                        </Button>
                        <Button type="submit" className="font-bold">
                          Lưu thay đổi
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>,
            document.body
          )}
      </ManagerScreenLayout>

      <ConfirmDialog
        open={deleteClassId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteClassId(null)
        }}
        title="Xóa lớp học?"
        description="Thao tác này không thể hoàn tác. Tất cả thành viên sẽ bị xóa khỏi lớp."
        confirmLabel="Xóa lớp"
        destructive
        onConfirm={() => {
          if (deleteClassId) deleteClass.mutate(deleteClassId)
          setDeleteClassId(null)
        }}
      />

      <ConfirmDialog
        open={isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
        title={`Đóng lớp "${closeClassTarget?.name ?? ''}"?`}
        description={
          closeClassTarget?.isKnowledgeWork === false
            ? 'Lớp ngừng nhận đăng ký mới và không còn hiện trong danh sách để học viên đăng ký. Học viên hiện tại vẫn ở trong lớp. Có thể mở lại bất cứ lúc nào.'
            : 'Lớp ngừng nhận đăng ký mới và không còn hiện trong danh sách để học viên đăng ký. Học viên hiện tại vẫn ở trong lớp nhưng sẽ được phép đăng ký lớp tri thức khác. Có thể mở lại bất cứ lúc nào.'
        }
        confirmLabel="Đóng lớp"
        onConfirm={() => {
          if (closeClassTarget) {
            updateClass.mutate({ classId: closeClassTarget.id, input: { status: 'closed' } })
          }
          setIsCloseConfirmOpen(false)
        }}
      />
    </>
  )
}
