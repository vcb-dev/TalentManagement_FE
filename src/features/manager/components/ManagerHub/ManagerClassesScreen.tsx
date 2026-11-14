import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Form } from '@/components/ui/form'
import { DateController, InputController } from '@/components/ui/form-controllers'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCourseOptions } from '@/features/courses/hooks'
import { EditorClassesSection } from '@/features/editor-classes/components/EditorClassesSection'
import {
  buildCourseFilterOptions,
  matchesCourseFilter,
  type ClassCourseFilter,
} from '@/features/manager/classCourseFilter'
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
  Calendar,
  CalendarRange,
  FilterX,
  Loader2,
  PlusCircle,
  Search,
  UserPlus2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ClassCard } from './ClassCard'
import { ClassCourseFields } from './ClassCourseFields'
import { ClassCourseFilterPopover } from './ClassCourseFilterPopover'
import { ManagerScreenLayout } from './ManagerScreenLayout'

type ClassFormValues = {
  name: string
  startDate: string
  endDate: string
  /** '' = không thuộc khoá học. */
  courseId: string
  /** '' = dạy cả khoá. */
  coursePathId: string
}

const EMPTY_CLASS_FORM: ClassFormValues = {
  name: '',
  startDate: '',
  endDate: '',
  courseId: '',
  coursePathId: '',
}

/**
 * Lớp mới không còn loại lớp / cấp lớp (thay bằng khoá học & lộ trình) — lưu như "lớp học khác" cũ:
 * trọn dải Tập sự → Tướng, ai cũng tự đăng ký được, không giới hạn 1 lớp. Lớp cũ giữ nguyên loại/cấp.
 */
const NEW_CLASS_TYPE = { isKnowledgeWork: false, levelFrom: 'tap_su', levelTo: 'tuong' } as const

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

function ClassGrid({
  rows,
  emptyTitle,
  emptyHint,
  onEdit,
  onDelete,
  onToggleStatus,
  canManageMembers,
}: {
  rows: ManagerClass[]
  emptyTitle: string
  emptyHint: string | null
  onEdit?: (row: ManagerClass) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (row: ManagerClass) => void
  canManageMembers?: boolean
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
          canManageMembers={canManageMembers}
        />
      ))}
    </div>
  )
}

export function ManagerClassesScreen({
  courseFilter,
  onCourseFilterChange,
}: {
  courseFilter: ClassCourseFilter
  onCourseFilterChange: (next: ClassCourseFilter) => void
}) {
  const { canId } = usePermission()
  /** Không có `manager.classes` (vd. HR chỉ có `hr.classes.view`) → chỉ xem, ẩn tạo/sửa/xoá. */
  const canManage = canId('manager.classes')
  /** Chỉ admin: thêm / xoá học viên thẳng trên thẻ lớp (người khác: tự đăng ký + giáo viên duyệt). */
  const canManageMembers = canId('class.members.manage')
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

  const createForm = useForm<ClassFormValues>({ defaultValues: EMPTY_CLASS_FORM })
  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    setValue: setCreateValue,
  } = createForm
  const createStartDate = useWatch({ control: createControl, name: 'startDate' })
  const createEndDate = useWatch({ control: createControl, name: 'endDate' })
  const createCourseId = useWatch({ control: createControl, name: 'courseId' }) ?? ''
  const createCoursePathId = useWatch({ control: createControl, name: 'coursePathId' }) ?? ''

  const editForm = useForm<ClassFormValues>({ defaultValues: EMPTY_CLASS_FORM })
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    setValue: setEditValue,
  } = editForm
  const editStartDate = useWatch({ control: editControl, name: 'startDate' })
  const editEndDate = useWatch({ control: editControl, name: 'endDate' })
  const editCourseId = useWatch({ control: editControl, name: 'courseId' }) ?? ''
  const editCoursePathId = useWatch({ control: editControl, name: 'coursePathId' }) ?? ''

  const [deleteClassId, setDeleteClassId] = useState<string | null>(null)
  // Giữ target sau khi đóng hộp thoại để tiêu đề không nháy rỗng lúc animation thoát.
  const [closeClassTarget, setCloseClassTarget] = useState<ManagerClass | null>(null)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)

  const { data: rows = [], isLoading, isError, error } = useManagerClasses({ search })
  const editingRow = rows.find((r) => r.id === editClassId)
  // Cùng query với ô chọn khoá trong form — dùng cho bộ lọc khoá và gợi ý tên lớp.
  const { data: courseOptions = [] } = useCourseOptions(true)
  const createCourse = courseOptions.find((c) => c.id === createCourseId)
  const createCoursePath = createCourse?.paths.find((p) => p.id === createCoursePathId)
  const createNamePlaceholder = createCourse
    ? `Ví dụ: ${createCoursePath?.title ?? createCourse.title} — Đợt 1`
    : 'Ví dụ: Lớp đào tạo cán bộ nguồn — Đợt 1'
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
  // Lớp Editor do hệ thống đồng bộ theo team, không thuộc khoá — tách khu riêng, ẩn khi đang lọc khoá.
  const regularRows = rowsInPeriod.filter((r) => r.kind !== 'EDITOR')
  const courseFilterOptions = buildCourseFilterOptions(regularRows, courseOptions)
  const hasCourseFilter = Boolean(courseFilter.course)
  const courseRows = regularRows.filter((r) => matchesCourseFilter(r, courseFilter))
  const editorRows = hasCourseFilter ? [] : rowsInPeriod.filter((r) => r.kind === 'EDITOR')
  const visibleRows = [...courseRows, ...editorRows]
  const totalMembers = visibleRows.reduce((a, r) => a + r.memberCount, 0)
  const openCount = visibleRows.filter((r) => matchesStatus(r, 'open')).length
  // Thống kê phía trên không theo bộ lọc trạng thái; bộ lọc trạng thái chỉ áp cho lưới lớp.
  const byStatus = (list: ManagerClass[]) => list.filter((r) => matchesStatus(r, statusFilter))
  const hasTimeFilter = Boolean(fromDate || toDate)
  const isFiltering =
    search.trim() !== '' || statusFilter !== 'all' || hasTimeFilter || hasCourseFilter
  const timeFilterLabel =
    fromDate && toDate
      ? `${formatFilterDate(fromDate)} – ${formatFilterDate(toDate)}`
      : fromDate
        ? `Từ ${formatFilterDate(fromDate)}`
        : toDate
          ? `Đến ${formatFilterDate(toDate)}`
          : 'Thời gian'

  // Đang lọc một khoá / lộ trình → điền sẵn khoá / lộ trình đó cho lớp mới.
  const openCreateModal = () => {
    const filterCourse = courseOptions.find((c) => c.id === courseFilter.course)
    resetCreateForm({
      ...EMPTY_CLASS_FORM,
      courseId: filterCourse?.id ?? '',
      coursePathId: filterCourse?.paths.some((p) => p.id === courseFilter.path)
        ? (courseFilter.path ?? '')
        : '',
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
        ...NEW_CLASS_TYPE,
        status: 'open',
        startDate: values.startDate,
        endDate: values.endDate || null,
        memberUserIds: [],
        teacherUserId: selectedCreateTeacher?.userId ?? null,
        courseId: values.courseId || null,
        coursePathId: values.coursePathId || null,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          setCreateMemberQuery('')
          setSelectedCreateMembers([])
          setCreateTeacherQuery('')
          setSelectedCreateTeacher(null)
          // Lớp vừa tạo nằm ngoài khoá đang lọc → bỏ lọc khoá để thấy ngay.
          const created = {
            course: values.courseId ? { id: values.courseId, title: '' } : null,
            coursePath: values.coursePathId ? { id: values.coursePathId, title: '' } : null,
          }
          if (!matchesCourseFilter(created, courseFilter)) onCourseFilterChange({})
        },
      }
    )
  })

  const closeEditClassModal = () => {
    setEditClassId(null)
    resetEditForm(EMPTY_CLASS_FORM)
    setEditModalTeacherQuery('')
    setSelectedTeacher(null)
  }

  const openEditClassModal = (row: ManagerClass) => {
    setEditClassId(row.id)
    resetEditForm({
      name: row.name,
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
      courseId: row.course?.id ?? '',
      coursePathId: row.coursePath?.id ?? '',
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
          // Không gửi loại lớp / cấp lớp → lớp cũ giữ nguyên loại & cấp đã lưu.
          courseId: values.courseId || null,
          coursePathId: values.coursePathId || null,
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
                  Theo dõi khoá học, thời gian hoạt động, trạng thái và sĩ số từng lớp.
                </p>
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
                <div className="text-2xl font-bold text-foreground">{visibleRows.length}</div>
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
                placeholder="Tìm theo tên lớp, ví dụ: Lớp đào tạo cán bộ nguồn"
                className="h-auto w-full rounded-xl border border-transparent bg-muted/80 py-3 pl-11 pr-4 text-sm shadow-inner shadow-none outline-none ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <ClassCourseFilterPopover
              value={courseFilter}
              onChange={onCourseFilterChange}
              courses={courseFilterOptions.courses}
              noneCount={courseFilterOptions.noneCount}
            />
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
                        {visibleRows.filter((r) => matchesStatus(r, f.value)).length}
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
                      <ClassCourseFields
                        idPrefix="create-class"
                        value={{ courseId: createCourseId, coursePathId: createCoursePathId }}
                        onChange={(next) => {
                          setCreateValue('courseId', next.courseId)
                          setCreateValue('coursePathId', next.coursePathId)
                        }}
                      />
                      <InputController
                        control={createControl}
                        name="name"
                        label="Tên lớp"
                        required
                        placeholder={createNamePlaceholder}
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
                        {canManageMembers
                          ? ' Bạn cũng có thể thêm học viên trực tiếp ở mục học viên trên thẻ lớp.'
                          : null}
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
          <div className="space-y-10">
            <ClassGrid
              rows={byStatus(courseRows)}
              emptyTitle={
                isFiltering ? 'Không có lớp nào khớp tìm kiếm / bộ lọc' : 'Chưa có lớp học nào'
              }
              emptyHint={canManage && !isFiltering ? 'Nhấn "Tạo lớp" để tạo lớp đầu tiên.' : null}
              onEdit={canManage ? openEditClassModal : undefined}
              onDelete={canManage ? handleDeleteClass : undefined}
              onToggleStatus={canManage ? handleToggleStatus : undefined}
              canManageMembers={canManageMembers}
            />
            {!hasCourseFilter && (canManage || editorRows.length > 0) ? (
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
                      <ClassCourseFields
                        idPrefix="edit-class"
                        value={{ courseId: editCourseId, coursePathId: editCoursePathId }}
                        onChange={(next) => {
                          setEditValue('courseId', next.courseId)
                          setEditValue('coursePathId', next.coursePathId)
                        }}
                        current={editingRow}
                      />
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
