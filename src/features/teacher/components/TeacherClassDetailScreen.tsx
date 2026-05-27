import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Filter,
  Pencil,
  Search,
  Trash2,
  X,
  Star,
  Edit3,
  ClipboardCheck,
  CheckCircle2,
  FileDown,
  LayoutGrid,
  Table as TableIcon,
  XCircle,
} from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DateController,
  InputController,
  InputFieldController,
} from '@/components/ui/form-controllers'
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
import { SessionEvaluationModal } from './SessionEvaluationModal'
import { ViewEvaluationsModal } from './ViewEvaluationsModal'
import {
  useTeacherClassDetail,
  useTeacherCreateSchedule,
  useTeacherDeleteSchedule,
  useTeacherSchedules,
  useTeacherUpdateAttendance,
  useTeacherUpdateSchedule,
  useApproveClassRegistration,
  useRejectClassRegistration,
  useTeacherClassRegistrations,
} from '@/features/teacher/hooks'
import { TeacherClassMemberCard } from './TeacherClassMemberCard'
import type { ClassMemberRow } from './teacherClassMemberTypes'

const FILTERS = [{ key: 'all', label: 'Tất cả học viên' }] as const

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
        <Input
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
          className="h-auto w-[3.25rem] rounded-xl border border-border bg-background py-2.5 text-center font-mono text-sm tabular-nums shadow-none outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
          aria-label={`${label} — giờ`}
        />
        <span
          className="select-none pb-0.5 text-lg font-semibold leading-none text-muted-foreground"
          aria-hidden
        >
          :
        </span>
        <Input
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
          className="h-auto w-[3.25rem] rounded-xl border border-border bg-background py-2.5 text-center font-mono text-sm tabular-nums shadow-none outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
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
  const { data: registrations = [] } = useTeacherClassRegistrations(classId)
  const createSchedule = useTeacherCreateSchedule(classId)
  const updateSchedule = useTeacherUpdateSchedule(classId)
  const deleteSchedule = useTeacherDeleteSchedule(classId)
  const approveRegistration = useApproveClassRegistration(classId)
  const rejectRegistration = useRejectClassRegistration(classId)
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
  const deferredSearchDraft = useDeferredValue(searchDraft)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)

  // Evaluation modal state
  const [evalModalOpen, setEvalModalOpen] = useState(false)
  const [evalTarget, setEvalTarget] = useState<{ userId: string; userName: string } | null>(null)
  const [viewEvalModalOpen, setViewEvalModalOpen] = useState(false)
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({})
  const [approvingRegistrationId, setApprovingRegistrationId] = useState<string | null>(null)
  const [rejectingRegistrationId, setRejectingRegistrationId] = useState<string | null>(null)

  const updateAttendance = useTeacherUpdateAttendance(classId)

  // Tự động chọn buổi học đầu tiên nếu có dữ liệu và chưa chọn buổi nào
  useEffect(() => {
    if (schedules && schedules.length > 0 && !activeScheduleId) {
      setActiveScheduleId(schedules[0]?.id || null)
    }
  }, [schedules, activeScheduleId])

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === activeScheduleId),
    [schedules, activeScheduleId]
  )
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
  const [startHour, startMinute, endHour, endMinute] = useWatch({
    control: scheduleControl,
    name: ['startHour', 'startMinute', 'endHour', 'endMinute'],
  })

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
    let list = members
    if (deferredSearchDraft) {
      const s = deferredSearchDraft.toLowerCase()
      list = list.filter(
        (m) => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s)
      )
    }
    return list
  }, [members, deferredSearchDraft])

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
    <div className="-m-5 flex min-h-screen flex-col bg-[#f1f5f9] text-sm text-slate-900 md:-m-6 lg:-m-8">
      <div className="flex-1 overflow-y-auto px-4 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {/* Version Indicator - To confirm update */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-bold tracking-tighter text-slate-500 ring-1 ring-slate-900/10">
            PREMIUM UI V2.0 — ACTIVE
          </div>

          <div className="mb-12 space-y-6">
            <Link
              to="/teacher/classes"
              className="group inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:text-primary"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                <ArrowLeft className="h-4 w-4" />
              </div>
              Danh sách lớp phụ trách
            </Link>

            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    ĐANG GIẢNG DẠY
                  </div>
                  <p className="text-sm font-semibold text-slate-500/80">
                    Hệ thống quản lý học viên và điều phối lịch đào tạo chuyên nghiệp.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-full rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all',
                      viewMode === 'cards'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-50'
                    )}
                    onClick={() => setViewMode('cards')}
                  >
                    Dạng thẻ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-full rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all',
                      viewMode === 'table'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-50'
                    )}
                    onClick={() => setViewMode('table')}
                  >
                    Dạng bảng
                  </Button>
                </div>
                <Button className="h-11 rounded-2xl bg-primary px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
                  Xuất báo cáo
                </Button>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
            <Form {...filtersForm}>
              <div className="flex h-14 flex-1 items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5">
                <Search className="h-5 w-5 text-slate-400" />
                <InputFieldController
                  control={filtersForm.control}
                  name="searchDraft"
                  placeholder="Tìm kiếm học viên theo tên hoặc email..."
                  className="flex-1"
                  wrapperClassName="flex-1"
                  inputClassName="h-full border-0 bg-transparent text-base font-medium shadow-none focus-visible:ring-0 placeholder:text-slate-300"
                />
              </div>
            </Form>
            {/* Filter buttons - already simplified to 1 item, so we can hide or keep as label */}
            <div className="flex h-14 items-center rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <div className="px-6 text-xs font-black uppercase tracking-widest text-slate-900">
                Tất cả học viên
              </div>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Duyệt đăng ký
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  Học viên chờ vào lớp ({registrations.length})
                </h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {registrations.length === 0 ? (
                <p className="p-6 text-sm font-semibold text-slate-400">
                  Chưa có đăng ký nào đang chờ duyệt.
                </p>
              ) : (
                registrations.map((r) => (
                  <div
                    key={r.id}
                    className="grid gap-4 p-5 lg:grid-cols-[1fr_280px] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <EmployeeAvatar
                        name={r.user.name}
                        className="h-11 w-11 rounded-2xl shadow-sm ring-2 ring-background"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{r.user.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {r.user.email} · {r.user.jobTitle || 'Chưa có vị trí'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={rejectReasonById[r.id] ?? ''}
                        onChange={(e) =>
                          setRejectReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        placeholder="Lý do nếu từ chối"
                        className="h-9 rounded-xl text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 rounded-xl text-xs font-bold"
                          disabled={approveRegistration.isPending || rejectRegistration.isPending}
                          loading={
                            approvingRegistrationId === r.id && approveRegistration.isPending
                          }
                          onClick={() => {
                            setApprovingRegistrationId(r.id)
                            approveRegistration.mutate(r.id, {
                              onSettled: () => setApprovingRegistrationId(null),
                            })
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Duyệt
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl border-rose-200 text-xs font-bold text-rose-600"
                          disabled={approveRegistration.isPending || rejectRegistration.isPending}
                          loading={rejectingRegistrationId === r.id && rejectRegistration.isPending}
                          onClick={() => {
                            const reason = (rejectReasonById[r.id] ?? '').trim()
                            if (!reason) {
                              toast.error('Vui lòng nhập lý do từ chối')
                              return
                            }
                            setRejectingRegistrationId(r.id)
                            rejectRegistration.mutate(
                              { registrationId: r.id, reason },
                              { onSettled: () => setRejectingRegistrationId(null) }
                            )
                          }}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Từ chối
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Schedule Management Card - LIGHT THEME */}
          <div className="group relative mb-12 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 transition-all hover:shadow-primary/5">
            <div className="flex flex-col justify-between gap-8 p-8 sm:flex-row sm:items-center sm:px-12">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                  <CalendarDays className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    Lịch học & Điều phối
                  </h3>
                  <p className="text-sm font-semibold text-slate-400">
                    Điều phối các buổi đào tạo và theo dõi điểm danh
                  </p>
                </div>
              </div>
              <Button
                className="h-14 rounded-2xl bg-primary px-8 text-base font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
                onClick={() => {
                  resetScheduleValues()
                  setScheduleModalOpen(true)
                }}
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                THÊM BUỔI MỚI
              </Button>
            </div>

            {/* Session Navigation inside the card */}
            {schedules.length > 0 && (
              <div className="border-t border-slate-50 bg-slate-50/50 p-4 sm:px-12">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className={cn(
                      'h-11 rounded-xl px-6 text-xs font-black uppercase tracking-widest transition-all',
                      !activeScheduleId
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-slate-400 hover:bg-slate-100'
                    )}
                    onClick={() => setActiveScheduleId(null)}
                  >
                    TỔNG QUAN LỚP
                  </Button>
                  {schedules.map((s, idx) => {
                    const isActive = activeScheduleId === s.id
                    return (
                      <Button
                        key={s.id}
                        variant="ghost"
                        className={cn(
                          'h-11 rounded-xl px-6 text-xs font-black uppercase tracking-widest transition-all',
                          isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:bg-slate-100'
                        )}
                        onClick={() => setActiveScheduleId(s.id)}
                      >
                        BUỔI {idx + 1}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Management Modal */}
          {scheduleModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="absolute inset-0" onClick={() => setScheduleModalOpen(false)} />
              <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-900 px-8 py-6 text-white">
                  <h2 className="text-2xl font-black tracking-tight">
                    {editingScheduleId ? 'CẬP NHẬT BUỔI HỌC' : 'THÊM BUỔI HỌC MỚI'}
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    Thông tin chi tiết buổi đào tạo trực tiếp
                  </p>
                </div>

                <div className="p-8">
                  <Form {...scheduleForm}>
                    <form
                      className="space-y-6"
                      onSubmit={scheduleForm.handleSubmit((vals) => {
                        const payload = {
                          dateIso: vals.dateIso,
                          startTime: `${vals.startHour}:${vals.startMinute}`,
                          endTime: `${vals.endHour}:${vals.endMinute}`,
                          topic: vals.topic,
                          location: vals.location,
                        }
                        if (editingScheduleId) {
                          updateSchedule.mutate(
                            { scheduleId: editingScheduleId, input: payload },
                            {
                              onSuccess: () => {
                                setScheduleModalOpen(false)
                                toast.success('Đã cập nhật buổi học')
                              },
                            }
                          )
                        } else {
                          createSchedule.mutate(payload, {
                            onSuccess: () => {
                              setScheduleModalOpen(false)
                              toast.success('Đã thêm buổi học mới')
                            },
                          })
                        }
                      })}
                    >
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <DateController
                          control={scheduleForm.control}
                          name="dateIso"
                          label="Ngày học"
                          required
                          datePickerClassName="h-12 rounded-xl border-slate-200 focus:ring-slate-900/5"
                        />
                        <InputController
                          control={scheduleForm.control}
                          name="location"
                          label="Địa điểm / Phòng"
                          placeholder="VD: Phòng họp A, Zoom..."
                          inputClassName="h-12 rounded-xl border-slate-200 focus:ring-slate-900/5"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Thời gian bắt đầu
                          </label>
                          <div className="flex items-center gap-2">
                            <InputController
                              control={scheduleForm.control}
                              name="startHour"
                              label="Giờ"
                              labelClassName="sr-only"
                              type="number"
                              className="w-20"
                              inputClassName="h-12 text-center rounded-xl font-bold"
                            />
                            <span className="font-bold text-slate-300">:</span>
                            <InputController
                              control={scheduleForm.control}
                              name="startMinute"
                              label="Phút"
                              labelClassName="sr-only"
                              type="number"
                              className="w-20"
                              inputClassName="h-12 text-center rounded-xl font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Thời gian kết thúc
                          </label>
                          <div className="flex items-center gap-2">
                            <InputController
                              control={scheduleForm.control}
                              name="endHour"
                              label="Giờ"
                              labelClassName="sr-only"
                              type="number"
                              className="w-20"
                              inputClassName="h-12 text-center rounded-xl font-bold"
                            />
                            <span className="font-bold text-slate-300">:</span>
                            <InputController
                              control={scheduleForm.control}
                              name="endMinute"
                              label="Phút"
                              labelClassName="sr-only"
                              type="number"
                              className="w-20"
                              inputClassName="h-12 text-center rounded-xl font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <InputController
                        control={scheduleForm.control}
                        name="topic"
                        label="Nội dung đào tạo"
                        required
                        placeholder="VD: Kiến thức sản phẩm, Kỹ năng tư vấn..."
                        inputClassName="h-12 rounded-xl border-slate-200 focus:ring-slate-900/5"
                      />

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-12 rounded-xl px-6 font-bold text-slate-400 hover:bg-slate-50"
                          onClick={() => setScheduleModalOpen(false)}
                        >
                          HỦY BỎ
                        </Button>
                        <Button
                          type="submit"
                          className="h-12 rounded-xl bg-primary px-10 font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary/90"
                          loading={createSchedule.isPending || updateSchedule.isPending}
                        >
                          {editingScheduleId ? 'CẬP NHẬT' : 'LƯU BUỔI HỌC'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200/60">
              <div className="divide-y divide-border md:hidden">
                {filtered.map((m) => {
                  const currentSchedule = schedules.find((s) => s.id === activeScheduleId)
                  const rawAttendance =
                    currentSchedule?.attendanceData?.[m.id]?.attendance || 'NONE'

                  let displayAttendance = rawAttendance
                  if (currentSchedule && (rawAttendance === 'NONE' || !rawAttendance)) {
                    const now = new Date()
                    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
                    const vnDate = vnNow.toISOString().split('T')[0]
                    const vnTime = vnNow.toISOString().split('T')[1].substring(0, 5)

                    const isPassed =
                      currentSchedule.dateIso < vnDate ||
                      (currentSchedule.dateIso === vnDate && currentSchedule.endTime < vnTime)

                    if (isPassed) {
                      displayAttendance = 'ABSENT'
                    }
                  }

                  const sessionData = {
                    ...(currentSchedule?.attendanceData?.[m.id] || {}),
                    attendance: displayAttendance,
                  }

                  return (
                    <div key={m.id} className="space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={m.name}
                          className="h-10 w-10 shrink-0 rounded-2xl shadow-sm ring-2 ring-background"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-primary">{m.name}</p>
                          <p className="break-all text-xs font-medium text-muted-foreground/80">
                            {m.email}
                          </p>
                        </div>
                      </div>
                      {!activeScheduleId ? (
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Kết quả cuối khóa
                          </p>
                          {m.examResult ? (
                            <Badge className="rounded-lg border-0 bg-emerald-100/80 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              {m.examResult}
                            </Badge>
                          ) : (
                            <span className="font-bold text-muted-foreground/40">—</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-foreground">
                              {currentSchedule?.dateIso}
                            </p>
                            <p className="text-xs font-bold text-muted-foreground/60">
                              {currentSchedule?.startTime} - {currentSchedule?.endTime}
                            </p>
                          </div>
                          <p className="break-words text-xs font-bold text-muted-foreground">
                            {currentSchedule?.topic}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                              Điểm danh
                            </p>
                            <Select
                              value={sessionData.attendance || 'NONE'}
                              onValueChange={(v) =>
                                updateAttendance.mutate({
                                  scheduleId: activeScheduleId!,
                                  input: { userId: m.id, attendance: v },
                                })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-10 w-full max-w-full rounded-full border-0 font-black text-xs uppercase tracking-widest shadow-sm',
                                  sessionData.attendance === 'PRESENT' &&
                                    'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20',
                                  sessionData.attendance === 'ABSENT' &&
                                    'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20',
                                  sessionData.attendance === 'LATE' &&
                                    'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20',
                                  (!sessionData.attendance || sessionData.attendance === 'NONE') &&
                                    'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                                )}
                              >
                                <SelectValue placeholder="Chưa chọn" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 p-1 shadow-2xl">
                                <SelectItem
                                  value="NONE"
                                  className="rounded-xl py-2 font-bold text-slate-500 focus:bg-slate-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                    Chưa chọn
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="PRESENT"
                                  className="rounded-xl py-2 font-bold text-emerald-600 focus:bg-emerald-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Tham gia
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="ABSENT"
                                  className="rounded-xl py-2 font-bold text-rose-600 focus:bg-rose-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Vắng mặt
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="LATE"
                                  className="rounded-xl py-2 font-bold text-amber-600 focus:bg-amber-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Đến muộn
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Học viên
                      </th>
                      {!activeScheduleId ? (
                        <>
                          <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                            Thông tin Email
                          </th>
                          <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                            Kết quả cuối khóa
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-4 text-left">Ngày / Giờ</th>
                          <th className="px-6 py-4 text-left">Nội dung</th>
                          <th className="px-6 py-4 text-center">Điểm danh</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtered.map((m) => {
                      const currentSchedule = schedules.find((s) => s.id === activeScheduleId)
                      const rawAttendance =
                        currentSchedule?.attendanceData?.[m.id]?.attendance || 'NONE'

                      // Nếu buổi học đã qua mà vẫn 'NONE', hiển thị là 'ABSENT'
                      let displayAttendance = rawAttendance
                      if (currentSchedule && (rawAttendance === 'NONE' || !rawAttendance)) {
                        const now = new Date()
                        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
                        const vnDate = vnNow.toISOString().split('T')[0]
                        const vnTime = vnNow.toISOString().split('T')[1].substring(0, 5)

                        const isPassed =
                          currentSchedule.dateIso < vnDate ||
                          (currentSchedule.dateIso === vnDate && currentSchedule.endTime < vnTime)

                        if (isPassed) {
                          displayAttendance = 'ABSENT'
                        }
                      }

                      const sessionData = {
                        ...(currentSchedule?.attendanceData?.[m.id] || {}),
                        attendance: displayAttendance,
                      }

                      return (
                        <tr
                          key={m.id}
                          className="group border-b border-border/40 transition-colors hover:bg-muted/20"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <EmployeeAvatar
                                name={m.name}
                                className="h-10 w-10 rounded-2xl shadow-sm ring-2 ring-background transition-transform group-hover:scale-110"
                              />
                              <div>
                                <p className="text-sm font-black text-primary transition-colors group-hover:text-primary-600">
                                  {m.name}
                                </p>
                                <p className="text-xs font-medium text-muted-foreground/80">
                                  {m.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          {!activeScheduleId ? (
                            <>
                              <td className="px-6 py-4 text-muted-foreground font-medium">
                                {m.email}
                              </td>
                              <td className="px-6 py-4">
                                {m.examResult ? (
                                  <Badge className="rounded-lg bg-emerald-100/80 text-emerald-700 border-0 px-2.5 py-1 text-xs font-bold">
                                    {m.examResult}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/40 font-bold">—</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-foreground">
                                    {currentSchedule?.dateIso}
                                  </p>
                                  <p className="text-xs font-bold text-muted-foreground/60">
                                    {currentSchedule?.startTime} - {currentSchedule?.endTime}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="max-w-[200px] truncate text-xs font-bold text-muted-foreground">
                                  {currentSchedule?.topic}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <Select
                                    value={sessionData.attendance || 'NONE'}
                                    onValueChange={(v) =>
                                      updateAttendance.mutate({
                                        scheduleId: activeScheduleId!,
                                        input: { userId: m.id, attendance: v },
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        'h-9 w-[135px] rounded-full border-0 font-black text-xs uppercase tracking-widest transition-all shadow-sm',
                                        sessionData.attendance === 'PRESENT' &&
                                          'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20',
                                        sessionData.attendance === 'ABSENT' &&
                                          'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20',
                                        sessionData.attendance === 'LATE' &&
                                          'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20',
                                        (!sessionData.attendance ||
                                          sessionData.attendance === 'NONE') &&
                                          'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                                      )}
                                    >
                                      <SelectValue placeholder="Chưa chọn" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 p-1 shadow-2xl">
                                      <SelectItem
                                        value="NONE"
                                        className="rounded-xl py-2 font-bold text-slate-500 focus:bg-slate-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                          Chưa chọn
                                        </div>
                                      </SelectItem>
                                      <SelectItem
                                        value="PRESENT"
                                        className="rounded-xl py-2 font-bold text-emerald-600 focus:bg-emerald-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                          Tham gia
                                        </div>
                                      </SelectItem>
                                      <SelectItem
                                        value="ABSENT"
                                        className="rounded-xl py-2 font-bold text-rose-600 focus:bg-rose-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                          Vắng mặt
                                        </div>
                                      </SelectItem>
                                      <SelectItem
                                        value="LATE"
                                        className="rounded-xl py-2 font-bold text-amber-600 focus:bg-amber-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          Đến muộn
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    Trang {page} — {filtered.length} thành viên hiển thị
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
                    onClick={() => {
                      if (activeScheduleId) {
                        if (!selectedSchedule?.evaluatedUserIds?.length) {
                          toast.info('Chưa có đánh giá nào cho buổi học này')
                          return
                        }
                        setViewEvalModalOpen(true)
                      } else {
                        toast.error('Vui lòng chọn một buổi học để xem đánh giá')
                      }
                    }}
                  >
                    <Star className="mr-2 h-3.5 w-3.5 fill-current" /> Xem đánh giá buổi học
                  </Button>
                </div>
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

      {/* Evaluation Modal */}
      {evalTarget && (
        <SessionEvaluationModal
          open={evalModalOpen}
          onOpenChange={setEvalModalOpen}
          classId={classId}
          scheduleId={activeScheduleId!}
          userId={evalTarget.userId}
          userName={evalTarget.userName}
        />
      )}

      {/* View All Evaluations Modal for Teachers */}
      <ViewEvaluationsModal
        open={viewEvalModalOpen}
        onOpenChange={setViewEvalModalOpen}
        scheduleId={activeScheduleId || ''}
        sessionTitle={selectedSchedule?.topic || 'Buổi học'}
      />
    </div>
  )
}
