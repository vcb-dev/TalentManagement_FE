import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserPlus2,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InputController, SelectController } from '@/components/ui/form-controllers'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useAddClassMember,
  useClassMemberOptions,
  useCreateManagerClass,
  useDeleteManagerClass,
  useManagerClasses,
  useRemoveClassMember,
  useTeacherOptions,
  useUpdateManagerClass,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const STATUS_LABEL: Record<'open' | 'full' | 'closed', { label: string; className: string }> = {
  open: { label: 'Đang mở', className: 'bg-white/20 text-white backdrop-blur-md' },
  full: { label: 'Đủ chỗ', className: 'bg-white/20 text-white backdrop-blur-md' },
  closed: { label: 'Đã đóng', className: 'bg-white/15 text-white/90' },
}

const HEADER_GRADIENT: Record<'open' | 'full' | 'closed', string> = {
  open: 'from-primary via-primary-600 to-primary-700',
  full: 'from-amber-500 to-orange-600',
  closed: 'from-gray-500 to-gray-700',
}

const LEVEL_LABELS: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

type CreateLevel = 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong'

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

const DOT_PATTERN = 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.35) 1px, transparent 0)'

function toViDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

export function ManagerClassesScreen() {
  const [search, setSearch] = useState('')
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
  const [memberQueries, setMemberQueries] = useState<Record<string, string>>({})
  const [activeClassForDropdown, setActiveClassForDropdown] = useState<string | null>(null)
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
  const createForm = useForm<{ name: string; levelFrom: CreateLevel }>({
    defaultValues: { name: '', levelFrom: 'tap_su' },
  })
  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
  } = createForm
  const createLevelFrom = useWatch({ control: createControl, name: 'levelFrom' }) ?? 'tap_su'
  const editForm = useForm<{ name: string }>({
    defaultValues: { name: '' },
  })
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEditForm } = editForm

  const { data: rows = [], isLoading } = useManagerClasses({ search })
  const createClass = useCreateManagerClass()
  const deleteClass = useDeleteManagerClass()
  const addMember = useAddClassMember()
  const removeMember = useRemoveClassMember()
  const updateClass = useUpdateManagerClass()

  const activeQuery = activeClassForDropdown ? (memberQueries[activeClassForDropdown] ?? '') : ''
  const [debouncedActiveQuery, setDebouncedActiveQuery] = useState('')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [expandedMemberListIds, setExpandedMemberListIds] = useState<Set<string>>(new Set())

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleMembersExpand = (id: string) => {
    setExpandedMemberListIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedActiveQuery(activeQuery), 500)
    return () => clearTimeout(t)
  }, [activeQuery])

  const memberOptionsExcludeTeacherId = useMemo(() => {
    if (!activeClassForDropdown) return undefined
    const cls = rows.find((r) => r.id === activeClassForDropdown)
    return cls?.teacher?.userId
  }, [activeClassForDropdown, rows])

  const { data: memberOptions = [], isFetching: fetchingMemberOptions } = useClassMemberOptions(
    debouncedActiveQuery,
    undefined, // Lấy từ bảng users, không lọc theo cấp
    memberOptionsExcludeTeacherId
  )
  const { data: createMemberOptions = [], isFetching: fetchingCreateOptions } =
    useClassMemberOptions(
      debouncedCreateMemberQuery,
      undefined, // Lấy từ bảng users, không lọc theo cấp
      selectedCreateTeacher?.userId
    )
  const { data: createTeacherOptions = [], isFetching: fetchingCreateTeacherOptions } =
    useTeacherOptions(debouncedCreateTeacherQuery)
  const { data: editModalTeacherOptions = [], isFetching: fetchingEditModalTeacherOptions } =
    useTeacherOptions(debouncedEditModalTeacherQuery)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-dropdown-container')) {
        // Reset all search dropdown states
        setActiveClassForDropdown(null)
        // Only reset query if we are not currently selecting something
        // (actually better to just clear them to close dropdowns)
        if (!selectedCreateTeacher) setCreateTeacherQuery('')
        setCreateMemberQuery('')
        if (!selectedTeacher) setEditModalTeacherQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCreateTeacher, selectedTeacher])

  const totalMembers = rows.reduce((a, r) => a + r.memberCount, 0)
  const openCount = rows.filter((r) => r.status === 'open').length

  const onCreate = handleCreateSubmit((values) => {
    const n = values.name.trim()
    if (n.length < 3) {
      toast.error('Tên lớp ít nhất 3 ký tự')
      return
    }
    createClass.mutate(
      {
        name: n,
        levelFrom: values.levelFrom,
        levelTo: NEXT_LEVEL_BY_FROM[values.levelFrom],
        status: 'open',
        memberUserIds: selectedCreateMembers.map((m) => m.userId),
        teacherUserId: selectedCreateTeacher?.userId ?? null,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          setCreateMemberQuery('')
          setSelectedCreateMembers([])
          resetCreateForm({ name: '', levelFrom: 'tap_su' })
          setCreateTeacherQuery('')
          setSelectedCreateTeacher(null)
        },
      }
    )
  })

  const pageSubtitle =
    'Quản lý và điều phối nhân sự vào các lớp đào tạo. Dữ liệu lấy trực tiếp từ API manager/classes.'

  const optionsByClass = useMemo(() => {
    if (!activeClassForDropdown) return []
    const cls = rows.find((r) => r.id === activeClassForDropdown)
    const joined = new Set((cls?.members ?? []).map((m) => m.userId))
    const teacherId = cls?.teacher?.userId
    return memberOptions.filter((o) => !joined.has(o.userId) && o.userId !== teacherId)
  }, [activeClassForDropdown, rows, memberOptions])
  const closeEditClassModal = () => {
    setEditClassId(null)
    resetEditForm({ name: '' })
    setEditModalTeacherQuery('')
    setSelectedTeacher(null)
  }

  const openEditClassModal = (row: (typeof rows)[number]) => {
    setEditClassId(row.id)
    resetEditForm({ name: row.name })
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
    updateClass.mutate(
      { classId: editClassId, input: { name: n, teacherUserId: selectedTeacher?.userId ?? null } },
      {
        onSuccess: () => {
          closeEditClassModal()
        },
      }
    )
  })

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Chia lớp học</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-primary/10">
              <Calendar className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              Học kỳ Q2 / 2026
            </span>
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
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
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
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
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
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Lớp trong kỳ
              </div>
              <div className="text-2xl font-bold text-foreground">{rows.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="group relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
            strokeWidth={2}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp, ví dụ: Tập sự — Đợt Q2/2026"
            className="h-auto w-full rounded-xl border border-transparent bg-muted/80 py-3 pl-11 pr-4 text-sm shadow-inner shadow-none outline-none ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="flex shrink-0 gap-3">
          <Button
            type="button"
            className="gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-md"
            onClick={() => setIsCreateOpen((v) => !v)}
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
            Tạo lớp
          </Button>
        </div>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-5 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Tạo lớp học mới</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setIsCreateOpen(false)
                  resetCreateForm({ name: '', levelFrom: 'tap_su' })
                  setCreateMemberQuery('')
                  setSelectedCreateMembers([])
                  setCreateTeacherQuery('')
                  setSelectedCreateTeacher(null)
                }}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...createForm}>
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onCreate}>
                <InputController
                  control={createControl}
                  name="name"
                  label="Tên lớp"
                  required
                  rules={{ required: true, minLength: 3 }}
                  className="md:col-span-2"
                  placeholder="Ví dụ: Tập sự — Đợt Q2/2026"
                />

                <SelectController
                  control={createControl}
                  name="levelFrom"
                  label="Cấp lớp"
                  required
                  rules={{ required: true }}
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

                <div className="search-dropdown-container relative md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Giáo viên phụ trách lớp
                  </label>
                  <Input
                    value={selectedCreateTeacher ? selectedCreateTeacher.name : createTeacherQuery}
                    onChange={(e) => {
                      setCreateTeacherQuery(e.target.value)
                      if (selectedCreateTeacher) setSelectedCreateTeacher(null)
                    }}
                    placeholder="Gõ tên/email giáo viên..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {!selectedCreateTeacher && createTeacherQuery.trim().length > 0 ? (
                    <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                      {fetchingCreateTeacherOptions ? (
                        <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Đang tìm...
                        </div>
                      ) : createTeacherOptions.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          Không có kết quả phù hợp
                        </div>
                      ) : (
                        createTeacherOptions.map((opt) => (
                          <Button
                            key={opt.userId}
                            type="button"
                            variant="ghost"
                            className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                            onClick={() => {
                              setSelectedCreateTeacher(opt)
                              setCreateTeacherQuery('')
                              setSelectedCreateMembers((prev) =>
                                prev.filter((m) => m.userId !== opt.userId)
                              )
                            }}
                          >
                            <p className="font-semibold text-foreground">{opt.name}</p>
                            <p className="text-muted-foreground">{opt.email}</p>
                          </Button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>

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
                    {createMemberQuery.trim().length > 0 ? (
                      <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                        {fetchingCreateOptions ? (
                          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang tìm...
                          </div>
                        ) : createMemberOptions.filter(
                            (opt) =>
                              !selectedCreateMembers.some((m) => m.userId === opt.userId) &&
                              opt.userId !== selectedCreateTeacher?.userId
                          ).length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Không có kết quả phù hợp
                          </div>
                        ) : (
                          createMemberOptions
                            .filter(
                              (opt) =>
                                !selectedCreateMembers.some((m) => m.userId === opt.userId) &&
                                opt.userId !== selectedCreateTeacher?.userId
                            )
                            .map((opt) => (
                              <Button
                                key={opt.userId}
                                type="button"
                                variant="ghost"
                                className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedCreateMembers((prev) => [...prev, opt])
                                  setCreateMemberQuery('')
                                }}
                              >
                                <p className="font-semibold text-foreground">{opt.name}</p>
                                <p className="text-muted-foreground">{opt.email}</p>
                              </Button>
                            ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Nhân sự đã chọn
                  </p>
                  {selectedCreateMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa chọn nhân sự nào.</p>
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

                <div className="mt-5 flex justify-end gap-2 md:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false)
                      resetCreateForm({ name: '', levelFrom: 'tap_su' })
                      setCreateMemberQuery('')
                      setSelectedCreateMembers([])
                      setCreateTeacherQuery('')
                      setSelectedCreateTeacher(null)
                    }}
                    disabled={createClass.isPending}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="gap-2 font-bold"
                    disabled={createClass.isPending}
                  >
                    <PlusCircle className="h-4 w-4" />
                    {createClass.isPending ? 'Đang tạo…' : 'Tạo lớp'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 items-start md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const st = STATUS_LABEL[row.status]
          const header = HEADER_GRADIENT[row.status]
          const memberQuery = memberQueries[row.id] ?? ''
          const showDropdown = activeClassForDropdown === row.id && memberQuery.trim().length > 0
          return (
            <div
              key={row.id}
              className={cn(
                'rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-xl',
                activeClassForDropdown === row.id ? 'relative z-30' : 'relative z-0',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div
                className={cn(
                  'relative overflow-hidden bg-gradient-to-r transition-all duration-300 cursor-pointer select-none',
                  header,
                  collapsedIds.has(row.id) ? 'h-14 rounded-2xl' : 'h-24 rounded-t-2xl'
                )}
                onClick={() => toggleCollapse(row.id)}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage: DOT_PATTERN,
                    backgroundSize: '20px 20px',
                  }}
                />
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-between px-6',
                    collapsedIds.has(row.id) ? 'h-full' : 'pt-6'
                  )}
                >
                  <div className="flex flex-col">
                    {!collapsedIds.has(row.id) && (
                      <span
                        className={cn(
                          'mb-1 inline-block w-fit rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                          st.className
                        )}
                      >
                        {st.label}
                      </span>
                    )}
                    <h3
                      className={cn(
                        'font-bold leading-tight text-white transition-all',
                        collapsedIds.has(row.id) ? 'text-base' : 'text-lg'
                      )}
                    >
                      {row.name}
                      {collapsedIds.has(row.id) && (
                        <span className="ml-3 text-[10px] opacity-80 font-normal">
                          ({row.memberCount} thành viên)
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {collapsedIds.has(row.id) && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          st.className
                        )}
                      >
                        {st.label}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCollapse(row.id)
                      }}
                    >
                      {collapsedIds.has(row.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              {!collapsedIds.has(row.id) && (
                <div className="p-6 transition-all duration-300">
                  <div className="mb-6 flex items-center gap-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      {row.memberCount} thành viên
                    </span>
                  </div>

                  <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm font-extrabold text-foreground">
                      {LEVEL_LABELS[row.levelFrom]} → {LEVEL_LABELS[row.levelTo]}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      Kỳ thi dự kiến: {toViDate(row.examDate)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Giáo viên:{' '}
                      <span className="font-semibold text-foreground">
                        {row.teacher?.name || 'Chưa gán'}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const allMembers = row.members ?? []
                      const isExpanded = expandedMemberListIds.has(row.id)
                      const displayMembers = isExpanded ? allMembers : allMembers.slice(0, 5)

                      return (
                        <>
                          {displayMembers.map((m) => (
                            <div
                              key={m.userId}
                              className="flex items-center justify-between rounded-md border bg-white px-2 py-1.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{m.name}</p>
                                <p className="truncate text-muted-foreground">{m.email}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() =>
                                  removeMember.mutate({ classId: row.id, userId: m.userId })
                                }
                                title="Xóa khỏi lớp"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {allMembers.length > 5 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto w-full py-1 text-[10px] font-bold text-primary hover:bg-primary/5"
                              onClick={() => toggleMembersExpand(row.id)}
                            >
                              {isExpanded
                                ? 'Thu gọn'
                                : `Xem thêm ${allMembers.length - 5} học viên...`}
                            </Button>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  <div className="search-dropdown-container relative mt-3">
                    <Input
                      value={memberQuery}
                      onFocus={() => setActiveClassForDropdown(row.id)}
                      onChange={(e) => {
                        setActiveClassForDropdown(row.id)
                        setMemberQueries((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }}
                      placeholder="Gõ tên/email để thêm nhân sự..."
                      className="h-auto w-full rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                    {showDropdown ? (
                      <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                        {fetchingMemberOptions ? (
                          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang tìm...
                          </div>
                        ) : optionsByClass.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Không có kết quả phù hợp
                          </div>
                        ) : (
                          optionsByClass.map((opt) => (
                            <Button
                              type="button"
                              key={opt.userId}
                              variant="ghost"
                              className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                              onClick={() => {
                                addMember.mutate({ classId: row.id, userId: opt.userId })
                                setMemberQueries((prev) => ({ ...prev, [row.id]: '' }))
                                setActiveClassForDropdown(null)
                              }}
                            >
                              <p className="font-semibold text-foreground">{opt.name}</p>
                              <p className="text-muted-foreground">{opt.email}</p>
                            </Button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto rounded-lg py-2.5 text-xs font-bold text-destructive"
                      onClick={() => deleteClass.mutate(row.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Xóa lớp
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto rounded-lg border-primary/25 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => openEditClassModal(row)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
                      Chỉnh sửa
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Cập nhật {toViDate(row.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isLoading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Đang tải danh sách lớp...</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Không có lớp khớp tìm kiếm.
        </p>
      ) : null}

      <div className="mt-10 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-2 p-0 text-sm font-bold text-primary hover:underline"
          onClick={() => toast.info('Danh sách đầy đủ — nối API phân trang')}
        >
          Xem thêm tất cả các lớp
        </Button>
      </div>

      {editClassId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-5 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Chỉnh sửa lớp</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={closeEditClassModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Form {...editForm}>
              <form className="space-y-4" onSubmit={saveEditClass}>
                <InputController
                  control={editControl}
                  name="name"
                  label="Tên lớp"
                  required
                  rules={{ required: true, minLength: 3 }}
                  placeholder="Ví dụ: Tập sự – Đợt Q2/2026"
                />
                <div className="search-dropdown-container relative">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Giáo viên phụ trách lớp
                  </label>
                  <div className="relative z-40">
                    <Input
                      value={selectedTeacher ? selectedTeacher.name : editModalTeacherQuery}
                      onChange={(e) => {
                        setEditModalTeacherQuery(e.target.value)
                        if (selectedTeacher) setSelectedTeacher(null)
                      }}
                      placeholder="Gõ tên/email giáo viên..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                    {!selectedTeacher && editModalTeacherQuery.trim().length > 0 ? (
                      <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
                        {fetchingEditModalTeacherOptions ? (
                          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang tìm...
                          </div>
                        ) : editModalTeacherOptions.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Không có kết quả phù hợp
                          </div>
                        ) : (
                          editModalTeacherOptions.map((opt) => (
                            <Button
                              key={opt.userId}
                              type="button"
                              variant="ghost"
                              className="flex h-auto w-full flex-col items-start rounded px-2 py-2 text-left text-xs font-normal hover:bg-primary/10"
                              onClick={() => {
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
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lịch thi kỳ &amp; người chấm đặt tại mục Lịch thi &amp; chỉ định người chấm.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeEditClassModal}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateClass.isPending}>
                    {updateClass.isPending ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
