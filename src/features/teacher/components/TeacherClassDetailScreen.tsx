import { useEffect, useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Filter, Pencil, Search, Trash2, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Button } from '@/components/ui/button'
import { InputController } from '@/components/ui/form-controllers'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { PaginationCardStepper, PaginationPrevNext } from '@/components/ui/pagination'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import {
  clampHourPart,
  clampMinutePart,
  digitsOnlyMax2,
  joinTimeHm,
  splitTimeToParts,
} from '@/lib/time24h'
import { cn } from '@/lib/utils'
import {
  useTeacherClassDetail,
  useTeacherCreateSchedule,
  useTeacherDeleteSchedule,
  useTeacherSchedules,
  useTeacherUpdateSchedule,
} from '@/features/teacher/hooks'
import { TeacherClassMemberCard } from './TeacherClassMemberCard'
import type { ClassMemberRow } from './teacherClassMemberTypes'

const FILTERS: { key: 'all' | 'has' | 'none'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'has', label: 'Đã có KQ thi' },
  { key: 'none', label: 'Chưa có KQ' },
]

/** YYYY-MM-DD — ngày hôm nay (local), dùng cho min của input date. */
function getTodayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function TimeHmField({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  onHourBlur,
  onMinuteBlur,
  idPrefix,
}: {
  label: string
  hour: string
  minute: string
  onHourChange: (v: string) => void
  onMinuteChange: (v: string) => void
  onHourBlur: () => void
  onMinuteBlur: () => void
  idPrefix: string
}) {
  return (
    <div className="block text-xs font-semibold text-muted-foreground">
      <span className="mb-0 block">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={`${idPrefix}-h`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="00"
          maxLength={2}
          value={hour}
          onChange={(e) => onHourChange(digitsOnlyMax2(e.target.value))}
          onBlur={onHourBlur}
          className="w-[3.25rem] rounded-xl border border-border bg-background py-2.5 text-center font-mono text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          aria-label={`${label} — giờ`}
        />
        <span
          className="select-none pb-0.5 text-lg font-semibold leading-none text-muted-foreground"
          aria-hidden
        >
          :
        </span>
        <input
          id={`${idPrefix}-m`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="00"
          maxLength={2}
          value={minute}
          onChange={(e) => onMinuteChange(digitsOnlyMax2(e.target.value))}
          onBlur={onMinuteBlur}
          className="w-[3.25rem] rounded-xl border border-border bg-background py-2.5 text-center font-mono text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          aria-label={`${label} — phút`}
        />
      </div>
    </div>
  )
}

export function TeacherClassDetailScreen({ classId }: { classId: string }) {
  const routeHash = useRouterState({ select: (s) => s.location.hash })
  const { data } = useTeacherClassDetail(classId)
  const { data: schedules = [] } = useTeacherSchedules(classId)
  const createSchedule = useTeacherCreateSchedule(classId)
  const updateSchedule = useTeacherUpdateSchedule(classId)
  const deleteSchedule = useTeacherDeleteSchedule(classId)
  const title = data?.name || `Lớp ${classId}`
  const members: ClassMemberRow[] = useMemo(
    () =>
      (data?.members ?? []).map((m) => ({
        id: m.userId,
        name: m.name,
        email: m.email,
        examResult:
          m.latestResult?.outcome === 'DAT'
            ? 'Đạt'
            : m.latestResult?.outcome === 'BAO_LUU'
              ? 'Bảo lưu'
              : m.latestResult?.outcome === 'CHO_HOC_LAI'
                ? 'Chờ học lại'
                : m.latestResult?.outcome === 'CHIA_TAY'
                  ? 'Chia tay'
                  : null,
      })),
    [data?.members]
  )

  const filtersForm = useForm<{ filterKey: (typeof FILTERS)[number]['key']; searchDraft: string }>({
    defaultValues: { filterKey: 'all', searchDraft: '' },
  })
  const filterKey = useWatch({ control: filtersForm.control, name: 'filterKey' }) ?? 'all'
  const searchDraft = useWatch({ control: filtersForm.control, name: 'searchDraft' }) ?? ''
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const scheduleForm = useForm({
    defaultValues: {
      dateIso: '',
      startHour: '08',
      startMinute: '00',
      endHour: '10',
      endMinute: '00',
      topic: '',
      location: '',
    },
  })
  const {
    control: scheduleControl,
    getValues: getScheduleValues,
    reset: resetScheduleValues,
  } = scheduleForm
  const scheduleValues = useWatch({ control: scheduleControl })

  const scheduleInitial = {
    dateIso: '',
    startHour: '08',
    startMinute: '00',
    endHour: '10',
    endMinute: '00',
    topic: '',
    location: '',
  }

  const onEditSchedule = (scheduleId: string) => {
    const s = schedules.find((x) => x.id === scheduleId)
    if (!s) return
    setScheduleModalOpen(true)
    setEditingScheduleId(scheduleId)
    const [sh, sm] = splitTimeToParts(s.startTime)
    const [eh, em] = splitTimeToParts(s.endTime)
    const todayMin = getTodayIsoLocal()
    const dateIso = s.dateIso >= todayMin ? s.dateIso : todayMin
    resetScheduleValues({
      dateIso,
      startHour: sh,
      startMinute: sm,
      endHour: eh,
      endMinute: em,
      topic: s.topic,
      location: s.location ?? '',
    })
  }

  const closeScheduleModal = () => {
    setScheduleModalOpen(false)
    resetScheduleForm()
  }

  const resetScheduleForm = () => {
    setEditingScheduleId(null)
    resetScheduleValues(scheduleInitial)
  }

  const onSubmitSchedule = () => {
    const todayMin = getTodayIsoLocal()
    const values = getScheduleValues()
    if (!values.dateIso) {
      toast.error('Chọn ngày học.')
      return
    }
    if (values.dateIso < todayMin) {
      toast.error('Chỉ được chọn ngày từ hôm nay trở đi.')
      return
    }
    const startTime = joinTimeHm(values.startHour, values.startMinute)
    const endTime = joinTimeHm(values.endHour, values.endMinute)
    const input = {
      dateIso: values.dateIso,
      startTime,
      endTime,
      topic: values.topic.trim(),
      location: values.location.trim() || null,
    }
    if (editingScheduleId) {
      updateSchedule.mutate(
        { scheduleId: editingScheduleId, input },
        {
          onSuccess: () => resetScheduleForm(),
        }
      )
      return
    }
    createSchedule.mutate(input, { onSuccess: () => resetScheduleForm() })
  }

  const filtered = useMemo(() => {
    const q = searchDraft.trim().toLowerCase()
    return members.filter((m) => {
      const hasResult = m.examResult != null && m.examResult.length > 0
      if (filterKey === 'has' && !hasResult) return false
      if (filterKey === 'none' && hasResult) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.examResult?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [members, filterKey, searchDraft])

  const total = members.length
  const page = 1
  const totalPages = 1

  const scrollToFilters = () => {
    document
      .getElementById('teacher-class-detail-filters')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const h = routeHash?.replace(/^#/, '') ?? ''
    if (h !== 'lich-hoc') return
    const t = window.setTimeout(() => {
      document.getElementById('lich-hoc')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setEditingScheduleId(null)
      resetScheduleValues(scheduleInitial)
      setScheduleModalOpen(true)
    }, 100)
    return () => window.clearTimeout(t)
  }, [routeHash, classId, schedules.length])

  useEffect(() => {
    if (!scheduleModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScheduleModalOpen(false)
        setEditingScheduleId(null)
        resetScheduleValues(scheduleInitial)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scheduleModalOpen, resetScheduleValues])

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3.5rem)] flex-col bg-app-canvas text-sm text-foreground md:-m-6 lg:-m-8">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="page-shell">
          <div className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className={cn('min-w-0 flex-1 space-y-3', PAGE_HEADER_SURFACE)}>
                <Link
                  to="/teacher/classes"
                  className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  Danh sách lớp
                </Link>
                <h1 className={PAGE_HEADER_TITLE}>
                  <span className={PAGE_HEADER_GRADIENT}>{title}</span>
                </h1>
                <p className={PAGE_HEADER_DESCRIPTION}>
                  Thành viên, chấm điểm và{' '}
                  <strong className="font-semibold text-foreground">lịch học buổi</strong>{' '}
                  (GET/POST/PATCH/DELETE{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    /teacher/classes/:id/schedules
                  </code>
                  ).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                  onClick={scrollToFilters}
                >
                  <Filter className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  Bộ lọc
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors',
                    viewMode === 'table'
                      ? 'border-button bg-button text-button-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode((v) => (v === 'cards' ? 'table' : 'cards'))}
                >
                  {viewMode === 'cards' ? 'Dạng bảng' : 'Dạng thẻ'}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  onClick={() => toast.info('Xuất danh sách thành viên lớp sẽ nối API sau.')}
                >
                  Xuất dữ liệu
                </button>
              </div>
            </div>
          </div>

          <div
            id="teacher-class-detail-filters"
            className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4"
          >
            <div className="scrollbar-hide flex min-w-0 w-full overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
              <div role="tablist" aria-label="Lọc kết quả thi" className="flex min-w-min gap-0.5">
                {FILTERS.map(({ key, label }) => {
                  const selected = filterKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-[13px]',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-primary'
                      )}
                      onClick={() => filtersForm.setValue('filterKey', key)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="relative flex min-h-[42px] w-full min-w-0 items-center rounded-xl border border-border bg-card px-3 shadow-sm ring-1 ring-border/60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Controller
                control={filtersForm.control}
                name="searchDraft"
                render={({ field }) => (
                  <input
                    type="search"
                    placeholder="Tìm theo tên, email, kết quả…"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                    aria-label="Tìm thành viên"
                    {...field}
                  />
                )}
              />
            </label>
          </div>

          <div
            id="lich-hoc"
            className={cn(
              'mb-6 flex scroll-mt-24 flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-teal-500/[0.05] px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-primary/10 sm:px-5',
              CARD_ENTRANCE_HOVER
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
                <CalendarDays className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <p className="min-w-0 text-sm font-semibold text-foreground">Lịch học buổi</p>
            </div>
            <Button
              type="button"
              className="shrink-0 gap-2 font-bold shadow-sm"
              onClick={() => {
                resetScheduleForm()
                setScheduleModalOpen(true)
              }}
            >
              <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
              Thêm buổi học
            </Button>
          </div>

          {scheduleModalOpen ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Đóng"
                onClick={closeScheduleModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-dialog-title"
                className="relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <h2
                      id="schedule-dialog-title"
                      className="text-base font-bold tracking-tight text-foreground"
                    >
                      Lịch học buổi
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Xếp lịch cho lớp — đồng bộ qua API giáo viên.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={closeScheduleModal}
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InputController
                      control={scheduleControl}
                      name="dateIso"
                      label="Ngày"
                      type="date"
                      min={getTodayIsoLocal()}
                    />
                    <InputController
                      control={scheduleControl}
                      name="topic"
                      label="Nội dung buổi"
                      placeholder="Ví dụ: Ôn tập Spring Boot — Buổi 3"
                    />
                    <TimeHmField
                      label="Giờ bắt đầu"
                      idPrefix="schedule-start"
                      hour={scheduleValues.startHour ?? '08'}
                      minute={scheduleValues.startMinute ?? '00'}
                      onHourChange={(v) => scheduleForm.setValue('startHour', v)}
                      onMinuteChange={(v) => scheduleForm.setValue('startMinute', v)}
                      onHourBlur={() =>
                        scheduleForm.setValue(
                          'startHour',
                          clampHourPart(getScheduleValues('startHour') ?? '00')
                        )
                      }
                      onMinuteBlur={() =>
                        scheduleForm.setValue(
                          'startMinute',
                          clampMinutePart(getScheduleValues('startMinute') ?? '00')
                        )
                      }
                    />
                    <TimeHmField
                      label="Giờ kết thúc"
                      idPrefix="schedule-end"
                      hour={scheduleValues.endHour ?? '10'}
                      minute={scheduleValues.endMinute ?? '00'}
                      onHourChange={(v) => scheduleForm.setValue('endHour', v)}
                      onMinuteChange={(v) => scheduleForm.setValue('endMinute', v)}
                      onHourBlur={() =>
                        scheduleForm.setValue(
                          'endHour',
                          clampHourPart(getScheduleValues('endHour') ?? '00')
                        )
                      }
                      onMinuteBlur={() =>
                        scheduleForm.setValue(
                          'endMinute',
                          clampMinutePart(getScheduleValues('endMinute') ?? '00')
                        )
                      }
                    />
                    <p
                      id="schedule-time-hint"
                      className="md:col-span-2 text-[11px] text-muted-foreground"
                    >
                      Giờ theo định dạng 24h — nhập riêng giờ và phút; dấu{' '}
                      <span className="font-mono">:</span> hiển thị sẵn, không cần gõ.
                    </p>
                    <InputController
                      control={scheduleControl}
                      name="location"
                      label="Địa điểm (tuỳ chọn)"
                      className="md:col-span-2"
                      placeholder="Phòng họp A / MS Teams…"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetScheduleForm}>
                      Làm mới
                    </Button>
                    <Button
                      type="button"
                      className="font-bold shadow-sm"
                      onClick={onSubmitSchedule}
                      disabled={createSchedule.isPending || updateSchedule.isPending}
                    >
                      {editingScheduleId ? 'Lưu chỉnh sửa' : 'Thêm buổi học'}
                    </Button>
                  </div>
                  <div className="mt-5 overflow-x-auto rounded-xl border border-border/80 bg-card/80 shadow-inner">
                    <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-primary/10 via-teal-500/8 to-transparent">
                          <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Ngày
                          </th>
                          <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Giờ
                          </th>
                          <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nội dung
                          </th>
                          <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Địa điểm
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((s) => (
                          <tr key={s.id} className="border-t border-border/70">
                            <td className="px-3 py-2">{s.dateIso}</td>
                            <td className="px-3 py-2">
                              {s.startTime} - {s.endTime}
                            </td>
                            <td className="px-3 py-2">{s.topic}</td>
                            <td className="px-3 py-2">{s.location || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEditSchedule(s.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => deleteSchedule.mutate(s.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {schedules.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                              Chưa có buổi học nào.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/12 via-teal-500/8 to-violet-500/8">
                      <th className="px-4 py-3 font-semibold">Nhân viên</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Kết quả thi (lớp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t border-border/80 bg-card transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar name={m.name} className="h-8 w-8 text-xs" />
                            <span className="font-semibold text-foreground">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                        <td className="px-4 py-3">
                          {m.examResult ? (
                            <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                              {m.examResult}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Trang {page} — {filtered.length} thành viên hiển thị
                </span>
                <PaginationPrevNext page={page} totalPages={totalPages} onPageChange={() => {}} />
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'grid gap-8 gap-y-4',
                  selectedId
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                )}
              >
                {filtered.map((m, idx) => (
                  <TeacherClassMemberCard
                    key={m.id}
                    member={m}
                    cardIndex={idx}
                    selected={selectedId === m.id}
                    onSelect={() => setSelectedId((id) => (id === m.id ? null : m.id))}
                  />
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Không có thành viên phù hợp.
                </p>
              ) : null}
            </>
          )}

          {viewMode === 'cards' && filtered.length > 0 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Hiển thị {filtered.length} / {total} thành viên
              </span>
              <PaginationCardStepper page={page} totalPages={totalPages} onPageChange={() => {}} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
