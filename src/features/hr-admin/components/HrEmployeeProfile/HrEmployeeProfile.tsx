import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { FormProvider, type Control, useForm, useWatch } from 'react-hook-form'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FiveStarRank,
  GraduationCap,
  PROFILE_TAB_ICONS,
  ProfileStarTier,
  Settings,
  Target,
  UserCircle,
  Users,
} from '@/components/icons'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import {
  useDeactivateEmployee,
  useDirectManagerOptions,
  useUpdateEmployee,
} from '@/features/hr-admin/hooks'
import {
  buildDirectManagerSelectOptions,
  directManagerIdToStoredName,
  filterDirectManagerCandidates,
  resolveDirectManagerFormValue,
} from '@/features/hr-admin/directManagerOptions'
import { DirectManagerSearchField } from '@/features/hr-admin/components/DirectManagerSearchField'
import { DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import {
  EmployeeExtraTeamsField,
  extraTeamIdsEqual,
} from '@/features/hr-admin/components/EmployeeExtraTeamsField'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import {
  avatarClassForRole,
  employeePortraitUrl,
  levelMeta,
  levelPillText,
  shortId,
  statusLabelVi,
} from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { CARD_ENTRANCE_HOVER, CARD_HOVER, staggerStyle } from '@/lib/cardMotion'
import type { EmployeeLevel } from '@/types/employee'
import type { Role } from '@/types/auth'
import type { PatchEmployeeInput } from '@/types/api'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateController, InputController, SelectController } from '@/components/ui/form-controllers'
import { SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const PROFILE_EDIT_FIELD =
  'h-11 rounded-lg border-0 bg-muted/40 px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60'

type OptionItem = { value: string; label: string }

function dedupeOptionsByValue(options: OptionItem[]): OptionItem[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    const value = option.value.trim()
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

/** Tên phòng/nhóm cho select: ưu tiên cây tổ chức, rồi tên từ API; không dùng id rút gọn. */
function departmentSelectLabel(
  departmentId: string,
  fromTree: string | undefined,
  employee: EmployeeEntity
): string {
  const tree = fromTree?.trim()
  if (tree) return tree
  if (departmentId && departmentId === employee.departmentId) {
    const n = employee.departmentName?.trim()
    if (n) return n
  }
  return ''
}

function teamSelectLabel(
  teamId: string,
  fromTree: string | undefined,
  employee: EmployeeEntity,
  teamIndex: 0 | 1
): string {
  const tree = fromTree?.trim()
  if (tree) return tree
  if (teamId && employee.teamIds?.[teamIndex] === teamId) {
    const n = employee.teamNames?.[teamIndex]?.trim()
    if (n) return n
  }
  return ''
}

const LEVEL_ORDER: EmployeeLevel[] = [
  'tap_su',
  'biet_viec',
  'duoc_viec',
  'dong_gop_ket_qua',
  'tuong',
]

const TABS = [
  'Tổng quan',
  'Lộ trình học',
  'Kết quả thi',
  'Lịch sử làm việc',
  'Chỉnh sửa hồ sơ',
] as const

const TAB_ICONS_HR: LucideIcon[] = [
  PROFILE_TAB_ICONS.overview,
  PROFILE_TAB_ICONS.learning,
  PROFILE_TAB_ICONS.exams,
  PROFILE_TAB_ICONS.work,
  Settings,
]

function starVariants(filledStars: number, totalStars: number): ('filled' | 'current' | 'empty')[] {
  const n = Math.min(Math.max(totalStars, 1), 6)
  const f = Math.min(Math.max(Math.floor(filledStars), 0), n)
  const out: ('filled' | 'current' | 'empty')[] = []
  for (let i = 0; i < n; i++) {
    if (i < f) out.push('filled')
    else if (i === f && f < n) out.push('current')
    else out.push('empty')
  }
  return out
}

const ROLE_BADGE_ICONS: Record<Role, LucideIcon> = {
  MEMBER: UserCircle,
  LEADER: Target,
  MANAGER: Briefcase,
  HR: Building2,
  TEACHER: ClipboardList,
  BOD: BarChart3,
}

/** Role có thể chọn khi sửa hồ sơ (không gán Người chấm từ đây). */
const PROFILE_EDIT_ROLE_OPTIONS_BASE: Role[] = ['MEMBER', 'LEADER', 'MANAGER', 'HR', 'BOD']

export interface HrEmployeeProfileProps {
  employee: EmployeeEntity
  /** Mặc định mở tab khi vào từ URL `?mode=edit`. */
  initialTab?: number
}

type EmployeeEditFormValues = {
  name: string
  email: string
  role: Role
  departmentId: string
  teamId: string
  phone: string
  birthDate: string
  directManager: string
  startDate: string
  extraTeamIds: string[]
  currentLevel: EmployeeEntity['currentLevel']
}

export function HrEmployeeProfile({ employee, initialTab = 0 }: HrEmployeeProfileProps) {
  const { canId } = usePermission()
  const canEdit = canId('hr.employees.edit')
  const canDeactivate = canId('hr.employees.deactivate')
  const updateEmployee = useUpdateEmployee()
  const deactivateEmployee = useDeactivateEmployee()
  const isSaving = updateEmployee.isPending || deactivateEmployee.isPending
  const { data: directManagersData } = useDirectManagerOptions()
  const directManagers = useMemo(
    () => filterDirectManagerCandidates(directManagersData?.data ?? [], employee.id),
    [directManagersData?.data, employee.id]
  )

  const maxTab = 4
  const [tab, setTab] = useState(() => Math.min(maxTab, Math.max(0, initialTab)))
  const { label: tierLabel, tierClass } = levelMeta(employee.currentLevel)
  const maxStars = STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6
  const xpPct =
    maxStars > 0 ? Math.min(100, Math.round((employee.currentStar / maxStars) * 100)) : 0
  const levelIdx = LEVEL_ORDER.indexOf(employee.currentLevel)

  const editForm = useForm<EmployeeEditFormValues>({
    defaultValues: {
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      teamId: employee.teamIds[0] ?? DEFAULT_TEAM_ID,
      phone: employee.phone?.trim() ?? '',
      birthDate: employee.birthDate?.trim() ?? '',
      directManager: resolveDirectManagerFormValue(employee.directManager, []),
      startDate: employee.startDate?.trim() ?? '',
      extraTeamIds: employee.teamIds.slice(1),
      currentLevel: employee.currentLevel,
    },
  })
  const { control: editControl, getValues: getEditValues, reset: resetEditForm } = editForm

  /* Đồng bộ form sửa khi nhân viên được refetch sau lưu / điều hướng. */
  useEffect(() => {
    resetEditForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      teamId: employee.teamIds[0] ?? DEFAULT_TEAM_ID,
      phone: employee.phone?.trim() ?? '',
      birthDate: employee.birthDate?.trim() ?? '',
      directManager: resolveDirectManagerFormValue(employee.directManager, directManagers),
      startDate: employee.startDate?.trim() ?? '',
      extraTeamIds: employee.teamIds.slice(1),
      currentLevel: employee.currentLevel,
    })
  }, [
    employee.id,
    employee.updatedAt,
    employee.name,
    employee.email,
    employee.role,
    employee.departmentId,
    employee.teamIds,
    employee.phone,
    employee.birthDate,
    employee.directManager,
    employee.startDate,
    employee.currentLevel,
    directManagers,
    resetEditForm,
  ])

  const buildEditPatch = (values: EmployeeEditFormValues): PatchEmployeeInput | null => {
    const patch: PatchEmployeeInput = {}
    if (values.name.trim() !== employee.name) patch.name = values.name.trim()
    if (values.email.trim() !== employee.email) patch.email = values.email.trim()
    if (values.role !== employee.role) {
      patch.role = values.role as NonNullable<PatchEmployeeInput['role']>
    }
    if (values.departmentId !== employee.departmentId) patch.departmentId = values.departmentId
    const origTeam = employee.teamIds[0] ?? DEFAULT_TEAM_ID
    if (values.teamId !== origTeam) patch.teamId = values.teamId
    const origPhone = employee.phone?.trim() ?? ''
    if (values.phone.trim() !== origPhone) patch.phone = values.phone.trim()
    const origBirth = employee.birthDate?.trim() ?? ''
    if (values.birthDate.trim() !== origBirth) patch.birthDate = values.birthDate.trim()
    const origDirectManager = employee.directManager?.trim() ?? ''
    const nextDirectManager = directManagerIdToStoredName(values.directManager, directManagers)
    if ((nextDirectManager ?? '') !== (origDirectManager || '')) {
      patch.directManager = nextDirectManager
    }
    const origStart = employee.startDate?.trim() ?? ''
    if (values.startDate.trim() !== origStart) patch.startDate = values.startDate.trim()
    const origExtras = employee.teamIds.slice(1)
    const nextExtras = values.extraTeamIds ?? []
    if (!extraTeamIdsEqual(origExtras, nextExtras)) {
      patch.extraTeamIds = nextExtras
    }
    if (values.currentLevel !== employee.currentLevel) patch.currentLevel = values.currentLevel
    return Object.keys(patch).length > 0 ? patch : null
  }

  const handleSaveProfile = () => {
    if (!canEdit) return
    const patch = buildEditPatch(getEditValues())
    if (!patch) {
      toast.info('Không có thay đổi để lưu.')
      return
    }
    updateEmployee.mutate({ id: employee.id, patch })
  }

  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null)

  const handleDeactivateProfile = () => {
    if (!canDeactivate) return
    setConfirmAction('deactivate')
  }

  const handleReactivateProfile = () => {
    if (!canEdit) return
    setConfirmAction('reactivate')
  }

  const handleConfirmAction = () => {
    if (confirmAction === 'deactivate') deactivateEmployee.mutate(employee.id)
    else if (confirmAction === 'reactivate')
      updateEmployee.mutate({ id: employee.id, patch: { status: 'ACTIVE' } })
    setConfirmAction(null)
  }

  const empCode = `VCB-${shortId(employee.id).toUpperCase()}`

  const onDemoAction = (msg: string) => () => toast.info(msg)
  const orgSel = useHrOrgSelectOptions()

  const tabLabels = TABS
  const tabIcons = TAB_ICONS_HR
  const rankStarsFive = (xpPct / 100) * 5
  const levelStarVariants = starVariants(employee.currentStar, maxStars)
  const RoleBadgeIcon = ROLE_BADGE_ICONS[employee.role]
  const deptName = useMemo(() => {
    const fromApi = employee.departmentName?.trim()
    if (fromApi) return fromApi
    if (!employee.departmentId) return ''
    return orgSel.departments.find((d) => d.value === employee.departmentId)?.label?.trim() ?? ''
  }, [employee.departmentName, employee.departmentId, orgSel.departments])

  const teamName = useMemo(() => {
    const fromApi = (employee.teamNames ?? []).map((t) => t.trim()).filter(Boolean)
    if (fromApi.length > 0) return fromApi.join(', ')
    if (!employee.teamIds?.length) return ''
    const teamNameById = new Map(orgSel.allTeams.map((t) => [t.value, t.label]))
    const mapped = employee.teamIds
      .map((id) => teamNameById.get(id)?.trim())
      .filter((s): s is string => Boolean(s))
    return mapped.join(', ')
  }, [employee.teamNames, employee.teamIds, orgSel.allTeams])

  const hasAnyTeam = Boolean(teamName.trim())

  return (
    <>
      <FormProvider {...editForm}>
        <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-gradient-to-b from-indigo-50/60 via-sky-50/40 to-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
          <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 pb-6 pt-6 md:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pt-8">
            <aside className="w-full shrink-0 lg:w-[280px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground lg:mb-0 lg:block">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Link
                    to="/hr-admin"
                    search={{ page: 1, pageSize: 15 }}
                    className="font-semibold text-primary hover:underline"
                  >
                    ← Danh sách nhân sự
                  </Link>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="font-semibold text-foreground">{employee.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:hidden"></div>
              </div>

              <div className="flex flex-col gap-6 rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-white via-indigo-50/30 to-sky-50/30 p-5 shadow-[0_14px_34px_-22px_rgba(59,130,246,0.35)]">
                <div className="relative mx-auto">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employeePortraitUrl(employee.avatarUrl)}
                    fallbackClassName={avatarClassForRole(employee.role)}
                    showOnlineDot={employee.status === 'ACTIVE'}
                    className="h-32 w-32 rounded-2xl border-[3px] border-white text-2xl shadow-[var(--shadow-game-float)] ring-4 ring-primary/15 sm:h-44 sm:w-44 sm:text-4xl"
                  />
                </div>

                <div>
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Phân công
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug text-foreground">
                          {deptName}
                        </span>
                        <span className="shrink-0 rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-800">
                          Chính
                        </span>
                      </div>
                    </div>
                    {hasAnyTeam ? (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold leading-snug text-foreground">
                            {teamName}
                          </span>
                          <span className="shrink-0 rounded-md bg-cyan-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-cyan-800">
                            Nhóm
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Kỹ năng &amp; huy hiệu
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                      <Award
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{levelPillText(employee.currentLevel)}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                      <RoleBadgeIcon
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{ROLE_LABEL_VI[employee.role]}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm leading-snug text-foreground">
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{statusLabelVi(employee.status)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-4 hidden flex-wrap items-center justify-end gap-2 lg:flex">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onDemoAction('Hủy hoạt động: cần xác nhận và API.')}
                >
                  Hủy hoạt động
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onDemoAction('Lưu thay đổi: kết nối API sau.')}
                >
                  Lưu thay đổi
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-white to-indigo-50/20 shadow-[0_16px_36px_-22px_rgba(30,64,175,0.35)]">
                <div className="border-b border-indigo-100/90 bg-gradient-to-r from-indigo-50/65 via-white to-cyan-50/45 px-5 py-5 md:px-6">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                    {employee.name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2
                      className="h-4 w-4 shrink-0 text-primary/70"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span>{hasAnyTeam ? `${deptName} · ${teamName}` : deptName}</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-indigo-700 md:text-xl">
                    {ROLE_LABEL_VI[employee.role]} ·{' '}
                    {LEVEL_LABELS[employee.currentLevel as LevelCode]}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center border-t border-border/60 pt-4">
                    <FiveStarRank filled={rankStarsFive} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-foreground">
                      <RoleBadgeIcon
                        className="h-3.5 w-3.5 shrink-0 text-primary/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {ROLE_LABEL_VI[employee.role]}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border border-primary/15 px-2.5 py-1 text-xs font-medium',
                        tierClass
                      )}
                    >
                      <Award
                        className="h-3.5 w-3.5 shrink-0 opacity-90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {tierLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-foreground">
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-primary/90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {statusLabelVi(employee.status)}
                    </span>
                  </div>
                </div>

                <nav
                  className="flex flex-wrap gap-0 border-b border-indigo-100/80 bg-white/65 px-1 sm:px-2 md:px-4"
                  aria-label="Mục hồ sơ nhân viên"
                >
                  {tabLabels.map((label, i) => {
                    const Icon = tabIcons[i]!
                    const active = tab === i
                    return (
                      <Button
                        key={label}
                        type="button"
                        variant="ghost"
                        onClick={() => setTab(i)}
                        className={cn(
                          'relative inline-flex h-auto min-h-0 items-center gap-1.5 rounded-none px-2 py-3 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:py-3.5 sm:text-sm md:px-4',
                          active
                            ? 'text-indigo-700 hover:bg-transparent hover:text-indigo-700'
                            : 'text-muted-foreground hover:bg-indigo-50/70 hover:text-indigo-700'
                        )}
                      >
                        <Icon
                          className="h-3.5 w-3.5 shrink-0 opacity-85 sm:h-4 sm:w-4"
                          strokeWidth={2}
                        />
                        {label}
                        {active ? (
                          <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-indigo-600 sm:left-3 sm:right-3 md:left-4 md:right-4" />
                        ) : null}
                      </Button>
                    )
                  })}
                </nav>

                <div className="page-shell">
                  {tab === 0 && (
                    <OverviewTab
                      employee={employee}
                      tierLabel={tierLabel}
                      tierClass={tierClass}
                      xpPct={xpPct}
                      maxStars={maxStars}
                      levelStarVariants={levelStarVariants}
                    />
                  )}
                  {tab === 1 && <LearningPathTab employee={employee} levelIdx={levelIdx} />}
                  {tab === 2 && <ExamResultsTab />}
                  {tab === 3 && <WorkHistoryTab />}
                  {tab === 4 && (
                    <EditTab
                      employee={employee}
                      control={editControl}
                      directManagers={directManagers}
                      empCode={empCode}
                      canEdit={canEdit}
                      canDeactivate={canDeactivate}
                      isSaving={isSaving}
                      onSave={handleSaveProfile}
                      onDeactivate={handleDeactivateProfile}
                      onReactivate={handleReactivateProfile}
                    />
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </FormProvider>
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        title={
          confirmAction === 'deactivate' ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'
        }
        description={
          confirmAction === 'deactivate'
            ? 'Nhân viên sẽ không thể đăng nhập sau khi bị vô hiệu hóa.'
            : 'Nhân viên sẽ được khôi phục quyền đăng nhập.'
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Vô hiệu hóa' : 'Kích hoạt'}
        destructive={confirmAction === 'deactivate'}
        onConfirm={handleConfirmAction}
      />
    </>
  )
}

function PfCard({
  title,
  children,
  entranceIndex,
}: {
  title: string
  children: ReactNode
  entranceIndex?: number
}) {
  return (
    <div
      className={cn(
        'mb-3.5 overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-card)]',
        entranceIndex !== undefined ? CARD_ENTRANCE_HOVER : CARD_HOVER
      )}
      style={entranceIndex !== undefined ? staggerStyle(entranceIndex) : undefined}
    >
      <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-3.5 py-3 text-xs font-bold uppercase tracking-[0.7px] text-primary md:text-sm">
        {title}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  )
}

function OverviewTab({
  employee,
  tierLabel,
  tierClass,
  xpPct,
  maxStars,
  levelStarVariants,
}: {
  employee: EmployeeEntity
  tierLabel: string
  tierClass: string
  xpPct: number
  maxStars: number
  levelStarVariants: ('filled' | 'current' | 'empty')[]
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <div className="space-y-4">
        <PfCard title="Thống kê học tập" entranceIndex={0}>
          <div className="space-y-0">
            {(
              [
                { Icon: ClipboardList, label: 'Bài đã nộp (gần nhất)', value: '—' },
                { Icon: CheckCircle2, label: 'Tỉ lệ đạt', value: '—' },
                { Icon: GraduationCap, label: 'Kỳ thi đã qua', value: '—' },
                { Icon: Calendar, label: 'Thời gian làm việc', value: '—' },
                { Icon: Users, label: 'Mentee (nếu có)', value: '—' },
              ] as const
            ).map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex justify-between border-b border-border py-2.5 text-sm last:border-0 md:text-base"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-primary/85"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {label}
                </span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </PfCard>
        <PfCard title="Thành tích" entranceIndex={1}>
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu từ hệ thống.</p>
        </PfCard>
      </div>
      <div className="space-y-4">
        <div
          className={cn(
            'rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-sky-50/90 to-teal-50/80 p-5 text-foreground shadow-[var(--shadow-card)] ring-1 ring-primary/15',
            CARD_ENTRANCE_HOVER
          )}
          style={staggerStyle(2)}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">
                Cấp độ hiện tại
              </div>
              <div className="mt-0.5 text-[22px] font-extrabold text-slate-900 md:text-2xl">
                {LEVEL_LABELS[employee.currentLevel as LevelCode]}
              </div>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold md:text-sm',
                tierClass
              )}
            >
              <Award className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              {tierLabel}
            </span>
          </div>
          <p className="mb-2 text-sm text-muted-foreground md:text-base">
            Tiến độ Sao {employee.currentStar}/{maxStars} ·{' '}
            {LEVEL_LABELS[employee.currentLevel as LevelCode]}
          </p>
          <div className="mb-2.5 flex flex-wrap gap-1">
            {levelStarVariants.map((v, i) => (
              <span
                key={i}
                className="inline-flex cursor-default rounded-sm motion-safe:animate-[dash-star-pop_0.42s_ease-out_both] motion-reduce:animate-none"
                style={{ animationDelay: `${i * 72}ms` }}
              >
                <ProfileStarTier variant={v} />
              </span>
            ))}
          </div>
          <div className="group/pb relative h-2 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary via-sky-600 to-accent motion-safe:animate-[profile-progress-fill_1.05s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
              style={{
                width: `${xpPct}%`,
                transformOrigin: '0 50%',
                animationDelay: `${levelStarVariants.length * 72 + 80}ms`,
              }}
            />
          </div>
          <div className="mt-1.5 text-right text-xs text-muted-foreground md:text-sm">
            {xpPct}% hoàn thành cấp độ
          </div>
        </div>
        <PfCard title="Lịch sử thăng cấp" entranceIndex={3}>
          <div className="relative px-3 py-1 pl-10">
            <div
              className="absolute bottom-4 left-[23px] top-4 w-0.5 rounded-full bg-gradient-to-b from-primary via-sky-500 to-accent opacity-[0.92]"
              aria-hidden
            />
            <div className="relative mb-3.5">
              <div className="absolute left-0 z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white md:h-10 md:w-10 md:text-base">
                {LEVEL_ORDER.indexOf(employee.currentLevel) + 1}
              </div>
              <div className="min-w-0 pl-12">
                <div className="text-sm font-bold text-foreground md:text-base">
                  {LEVEL_LABELS[employee.currentLevel as LevelCode]}{' '}
                  <span className="text-primary">· Đang học</span>
                </div>
                <div className="text-xs text-muted-foreground md:text-sm">
                  Cập nhật {new Date(employee.updatedAt).toLocaleDateString('vi-VN')}
                </div>
                <span
                  className={cn(
                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                    tierClass
                  )}
                >
                  {tierLabel}
                </span>
              </div>
            </div>
            <p className="pl-12 text-xs text-muted-foreground md:text-sm">
              Các cấp trước được ẩn khi có API lịch sử đầy đủ.
            </p>
          </div>
        </PfCard>
      </div>
    </div>
  )
}

function LearningPathTab({ employee, levelIdx }: { employee: EmployeeEntity; levelIdx: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tiến độ tổng thể" entranceIndex={0}>
        <div className="space-y-0">
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-xs text-muted-foreground">Cấp đang học</span>
            <span className="text-sm font-bold">
              {LEVEL_LABELS[employee.currentLevel as LevelCode]}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-xs text-muted-foreground">Sao hiện tại</span>
            <span className="text-sm font-bold">
              {employee.currentStar} / {STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-xs text-muted-foreground">Trạng thái</span>
            <span className="text-sm font-bold text-amber-700">Đang học</span>
          </div>
        </div>
      </PfCard>
      <div>
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-2.5 top-2 w-0.5 rounded-sm bg-gradient-to-b from-primary via-accent to-teal-200/55" />
          {LEVEL_ORDER.map((lv, i) => {
            const done = i < levelIdx
            const active = i === levelIdx
            const locked = i > levelIdx
            return (
              <div key={lv} className="relative mb-5">
                <div
                  className={cn(
                    'absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white',
                    done && 'bg-emerald-500',
                    active && 'bg-primary ring-2 ring-primary/40 ring-offset-2',
                    locked && 'border-border bg-primary/10'
                  )}
                />
                <div
                  className={cn(
                    'rounded-xl border p-3',
                    done && 'border-emerald-300 bg-emerald-50',
                    active && 'border-primary/30 bg-primary/10 shadow-[var(--shadow-card)]',
                    locked && 'border-border bg-[#F8FAFC] opacity-45'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">
                      {LEVEL_LABELS[lv]}{' '}
                      {active && <span className="text-primary">· Đang học</span>}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        done && 'bg-emerald-100 text-emerald-800',
                        active && 'bg-primary/10 text-primary',
                        locked && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {done ? 'Hoàn thành' : active ? `Sao ${employee.currentStar}/6` : 'Chưa mở'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ExamResultsTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tổng kết" entranceIndex={0}>
        <div className="space-y-0">
          {[
            ['Tổng kỳ thi', '6'],
            ['Đạt', '5'],
            ['Bảo lưu', '1'],
            ['Tỉ lệ đạt', '83%'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-border py-2 last:border-0">
              <span className="text-xs text-muted-foreground">{a}</span>
              <span className="text-sm font-bold">{b}</span>
            </div>
          ))}
        </div>
      </PfCard>
      <div className="space-y-2.5">
        <ExamCard
          title="Sao 5 — Được việc"
          badge="Đang chấm"
          badgeClass="bg-amber-100 text-amber-900"
          variant="inprog"
          stats={[
            ['Ngày nộp', '22/03/2026'],
            ['Người chấm', 'Lê Thu Hà'],
            ['Tiến độ', '2/5 mục'],
          ]}
        />
        <ExamCard
          title="Sao 4 — Được việc"
          badge="✓ Đạt"
          badgeClass="bg-emerald-100 text-emerald-800"
          variant="pass"
          stats={[
            ['Ngày thi', '15/03/2026'],
            ['Người chấm', 'Lê Thu Hà'],
            ['Kết quả', '5/5 mục'],
          ]}
          note='"Thực hiện đúng quy trình, mini-project chất lượng tốt."'
        />
      </div>
    </div>
  )
}

function ExamCard({
  title,
  badge,
  badgeClass,
  variant,
  stats,
  note,
}: {
  title: string
  badge: string
  badgeClass: string
  variant: 'inprog' | 'pass' | 'warn'
  stats: [string, string][]
  note?: string
}) {
  const bg =
    variant === 'pass'
      ? 'border-emerald-200 bg-emerald-50'
      : variant === 'warn'
        ? 'border-amber-200 bg-amber-50'
        : 'border-primary/30 bg-primary/10'
  return (
    <div className={cn('rounded-xl border p-3.5', bg)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{title}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', badgeClass)}>
          {badge}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{l}</div>
            <div className="text-sm font-bold">{v}</div>
          </div>
        ))}
      </div>
      {note ? (
        <p className="mt-2 border-t border-black/5 pt-2 text-xs italic text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  )
}

function WorkHistoryTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,300px)_1fr]">
      <PfCard title="Tóm tắt" entranceIndex={0}>
        <div className="space-y-0">
          {[
            ['Tổng thời gian', '—'],
            ['Phòng ban hiện tại', '—'],
            ['Team hiện tại', '—'],
            ['Lần điều chuyển', '—'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-border py-2 last:border-0">
              <span className="text-xs text-muted-foreground">{a}</span>
              <span className="text-sm font-bold">{b}</span>
            </div>
          ))}
        </div>
      </PfCard>
      <div>
        <h3 className="mb-3.5 text-sm font-bold text-foreground">Timeline sự kiện</h3>
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-2.5 top-2 w-0.5 rounded-sm bg-gradient-to-b from-primary via-accent to-teal-200/55" />
          {[
            [
              'Hoàn thành mốc học tập',
              '20/03/2026 · Người chấm: Lê Thu Hà',
              'Đạt',
              'bg-emerald-500',
            ],
            ['Thăng cấp bậc', '05/01/2026 · Manager phê duyệt', 'Thăng cấp', 'bg-primary'],
            ['Gia nhập & onboard', 'Theo dữ liệu hệ thống', 'Onboard', 'bg-slate-400'],
          ].map(([t, m, b, dot], idx) => (
            <div key={idx} className="relative mb-5">
              <div
                className={cn(
                  'absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white',
                  dot
                )}
              />
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{m}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-primary">
                    {b}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditTab({
  employee,
  control,
  directManagers,
  empCode,
  canEdit,
  canDeactivate,
  isSaving,
  onSave,
  onDeactivate,
  onReactivate,
}: {
  employee: EmployeeEntity
  control: Control<EmployeeEditFormValues>
  directManagers: EmployeeEntity[]
  empCode: string
  canEdit: boolean
  canDeactivate: boolean
  isSaving: boolean
  onSave: () => void
  onDeactivate: () => void
  onReactivate: () => void
}) {
  const orgSel = useHrOrgSelectOptions()
  const orgDisabled = !canEdit || isSaving
  const inactive = employee.status === 'INACTIVE'
  const [editRole, editDepartmentId, editTeamId] = useWatch({
    control,
    name: ['role', 'departmentId', 'teamId'],
  })

  const departmentOptions = useMemo(() => {
    const base = [...orgSel.departments]
    if (editDepartmentId && !base.some((o) => o.value === editDepartmentId)) {
      const label = departmentSelectLabel(editDepartmentId, undefined, employee)
      return dedupeOptionsByValue([{ value: editDepartmentId, label }, ...base])
    }
    return dedupeOptionsByValue(base)
  }, [orgSel.departments, editDepartmentId, employee])

  const teamOptions = useMemo(() => {
    const fromDept = orgSel.teamsByDept.get(editDepartmentId) ?? []
    const base = [...fromDept]
    if (editTeamId && !base.some((o) => o.value === editTeamId)) {
      const fromAll = orgSel.allTeams.find((o) => o.value === editTeamId)?.label
      const label = teamSelectLabel(editTeamId, fromAll, employee, 0)
      return dedupeOptionsByValue([{ value: editTeamId, label }, ...base])
    }
    return dedupeOptionsByValue(base)
  }, [orgSel.teamsByDept, orgSel.allTeams, editDepartmentId, editTeamId, employee])

  const roleSelectOptions = useMemo((): Role[] => {
    if (editRole === 'TEACHER') {
      return ['TEACHER', ...PROFILE_EDIT_ROLE_OPTIONS_BASE]
    }
    return PROFILE_EDIT_ROLE_OPTIONS_BASE
  }, [editRole])

  const levelSelectOptions = useMemo(
    () => LEVELS.map((lv) => ({ value: lv, label: LEVEL_LABELS[lv] })),
    []
  )

  const directManagerOptions = useMemo(
    () => buildDirectManagerSelectOptions(directManagers, employee.id, employee.directManager),
    [directManagers, employee.directManager, employee.id]
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <PfCard title="Phân công tổ chức" entranceIndex={0}>
          <SelectController
            control={control}
            name="role"
            label="Vai trò"
            className="mb-3"
            disabled={orgDisabled}
          >
            {roleSelectOptions.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL_VI[r]}
              </SelectItem>
            ))}
          </SelectController>
          <SelectController
            control={control}
            name="departmentId"
            label="Phòng ban"
            className="mb-3"
            disabled={orgDisabled}
          >
            {departmentOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectController>
          <SelectController
            control={control}
            name="teamId"
            label="Nhóm (theo phòng ban)"
            className="mb-3"
            disabled={orgDisabled}
          >
            {teamOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectController>
          <EmployeeExtraTeamsField
            control={control}
            name="extraTeamIds"
            primaryTeamId={editTeamId ?? ''}
            allTeams={orgSel.allTeams}
            disabled={orgDisabled}
            className="mb-3"
          />
          <DateController
            control={control}
            name="startDate"
            label="Ngày bắt đầu"
            disabled={orgDisabled}
          />
          <SelectController
            control={control}
            name="currentLevel"
            label="Cấp năng lực (lộ trình)"
            disabled={orgDisabled}
          >
            {levelSelectOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectController>
        </PfCard>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {inactive ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-primary/35 bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/15"
              disabled={!canEdit || isSaving}
              onClick={onReactivate}
            >
              Kích hoạt lại
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="flex-1 py-2.5 text-sm font-bold"
              disabled={!canDeactivate || isSaving}
              onClick={onDeactivate}
            >
              Hủy hoạt động
            </Button>
          )}
          <Button
            type="button"
            className="flex-[2] py-2.5 text-sm font-bold"
            disabled={!canEdit || isSaving}
            onClick={onSave}
          >
            {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
      <PfCard title="Thông tin cá nhân" entranceIndex={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputController control={control} name="name" label="Họ và tên" disabled={orgDisabled} />
          <InputController
            control={control}
            name="email"
            label="Địa chỉ email"
            type="email"
            disabled={orgDisabled}
          />
          <InputController
            control={control}
            name="phone"
            label="Số điện thoại"
            placeholder="09xx xxx xxx"
            disabled={orgDisabled}
          />
          <DateController
            control={control}
            name="birthDate"
            label="Ngày sinh"
            disabled={orgDisabled}
          />
          <DirectManagerSearchField
            control={control}
            name="directManager"
            options={directManagerOptions}
            disabled={orgDisabled}
            inputClassName={PROFILE_EDIT_FIELD}
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Mã nhân viên (hệ thống)
            </label>
            <Input
              className={cn(PROFILE_EDIT_FIELD, 'bg-muted/50 text-muted-foreground')}
              readOnly
              value={empCode}
            />
          </div>
        </div>
      </PfCard>
    </div>
  )
}
