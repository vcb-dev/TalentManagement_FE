import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  Crown,
  FiveStarRank,
  GraduationCap,
  PROFILE_TAB_ICONS,
  ProfileStarTier,
  Settings,
  Star,
  Target,
  UserCircle,
  Users,
} from '@/components/icons'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { useDeactivateEmployee, useUpdateEmployee } from '@/features/hr-admin/hooks'
import { DEFAULT_TEAM_ID } from '@/features/hr-admin/hrOrgOptions'
import { useHrOrgSelectOptions } from '@/features/hr-admin/useHrOrgTree'
import {
  levelMeta,
  levelPillText,
  employeeDeptDisplay,
  employeeTeamsDisplay,
  shortId,
  statusLabelVi,
} from '@/features/hr-admin/components/HrEmployeeList/employeeListUtils'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { CARD_ENTRANCE_HOVER, CARD_HOVER, staggerStyle } from '@/lib/cardMotion'
import { demoGamificationFromSeed } from '@/lib/demoGamification'
import type { EmployeeLevel } from '@/types/employee'
import type { Role } from '@/types/auth'
import type { PatchEmployeeInput } from '@/types/api'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PROFILE_EDIT_FIELD =
  'h-11 rounded-lg border-0 bg-muted/40 px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60'

const PROFILE_EDIT_SELECT =
  'flex h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 disabled:opacity-60'

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

export function HrEmployeeProfile({ employee, initialTab = 0 }: HrEmployeeProfileProps) {
  const { canId } = usePermission()
  const canEdit = canId('hr.employees.edit')
  const canDeactivate = canId('hr.employees.deactivate')
  const updateEmployee = useUpdateEmployee()
  const deactivateEmployee = useDeactivateEmployee()
  const isSaving = updateEmployee.isPending || deactivateEmployee.isPending

  const maxTab = 4
  const [tab, setTab] = useState(() => Math.min(maxTab, Math.max(0, initialTab)))
  const { label: tierLabel, tierClass } = levelMeta(employee.currentLevel)
  const maxStars = STARS_PER_LEVEL[employee.currentLevel as LevelCode] || 6
  const xpPct =
    maxStars > 0 ? Math.min(100, Math.round((employee.currentStar / maxStars) * 100)) : 0
  const levelIdx = LEVEL_ORDER.indexOf(employee.currentLevel)

  const [editName, setEditName] = useState(employee.name)
  const [editEmail, setEditEmail] = useState(employee.email)
  const [editRole, setEditRole] = useState<Role>(employee.role)
  const [editDepartmentId, setEditDepartmentId] = useState(employee.departmentId)
  const [editTeamId, setEditTeamId] = useState(() => employee.teamIds[0] ?? DEFAULT_TEAM_ID)
  const [editPhone, setEditPhone] = useState(() => employee.phone?.trim() ?? '')
  const [editBirthDate, setEditBirthDate] = useState(() => employee.birthDate?.trim() ?? '')
  const [editStartDate, setEditStartDate] = useState(() => employee.startDate?.trim() ?? '')
  const [editSecondaryTeamId, setEditSecondaryTeamId] = useState(() => employee.teamIds[1] ?? '')
  const [editCurrentLevel, setEditCurrentLevel] = useState(employee.currentLevel)

  /* Đồng bộ form sửa khi nhân viên được refetch sau lưu / điều hướng. */
  /* eslint-disable react-hooks/set-state-in-effect -- bản ghi từ server đổi sau PATCH/refetch */
  useEffect(() => {
    setEditName(employee.name)
    setEditEmail(employee.email)
    setEditRole(employee.role)
    setEditDepartmentId(employee.departmentId)
    setEditTeamId(employee.teamIds[0] ?? DEFAULT_TEAM_ID)
    setEditPhone(employee.phone?.trim() ?? '')
    setEditBirthDate(employee.birthDate?.trim() ?? '')
    setEditStartDate(employee.startDate?.trim() ?? '')
    setEditSecondaryTeamId(employee.teamIds[1] ?? '')
    setEditCurrentLevel(employee.currentLevel)
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
    employee.startDate,
    employee.currentLevel,
  ])
  /* eslint-enable react-hooks/set-state-in-effect */

  const buildEditPatch = (): PatchEmployeeInput | null => {
    const patch: PatchEmployeeInput = {}
    if (editName.trim() !== employee.name) patch.name = editName.trim()
    if (editEmail.trim() !== employee.email) patch.email = editEmail.trim()
    if (editRole !== employee.role) {
      patch.role = editRole as NonNullable<PatchEmployeeInput['role']>
    }
    if (editDepartmentId !== employee.departmentId) patch.departmentId = editDepartmentId
    const origTeam = employee.teamIds[0] ?? DEFAULT_TEAM_ID
    if (editTeamId !== origTeam) patch.teamId = editTeamId
    const origPhone = employee.phone?.trim() ?? ''
    if (editPhone.trim() !== origPhone) patch.phone = editPhone.trim()
    const origBirth = employee.birthDate?.trim() ?? ''
    if (editBirthDate.trim() !== origBirth) patch.birthDate = editBirthDate.trim()
    const origStart = employee.startDate?.trim() ?? ''
    if (editStartDate.trim() !== origStart) patch.startDate = editStartDate.trim()
    const origSec = employee.teamIds[1]?.trim() ?? ''
    if (editSecondaryTeamId.trim() !== origSec) {
      patch.secondaryTeamId = editSecondaryTeamId.trim()
    }
    if (editCurrentLevel !== employee.currentLevel) patch.currentLevel = editCurrentLevel
    return Object.keys(patch).length > 0 ? patch : null
  }

  const handleSaveProfile = () => {
    if (!canEdit) return
    const patch = buildEditPatch()
    if (!patch) {
      toast.info('Không có thay đổi để lưu.')
      return
    }
    updateEmployee.mutate({ id: employee.id, patch })
  }

  const handleDeactivateProfile = () => {
    if (!canDeactivate) return
    if (!window.confirm('Vô hiệu hóa tài khoản nhân viên này?')) return
    deactivateEmployee.mutate(employee.id)
  }

  const handleReactivateProfile = () => {
    if (!canEdit) return
    if (!window.confirm('Kích hoạt lại tài khoản nhân viên này?')) return
    updateEmployee.mutate({ id: employee.id, patch: { status: 'ACTIVE' } })
  }

  const empCode = `VCB-${shortId(employee.id).toUpperCase()}`
  const { points, rank } = useMemo(
    () => demoGamificationFromSeed(employee.email ?? employee.id),
    [employee.email, employee.id]
  )

  const onDemoAction = (msg: string) => () => toast.info(msg)

  const tabLabels = TABS
  const tabIcons = TAB_ICONS_HR
  const profileScoreDisplay = (points / 1000).toFixed(1).replace('.', ',')
  const rankStarsFive = (xpPct / 100) * 5
  const levelStarVariants = starVariants(employee.currentStar, maxStars)
  const RoleBadgeIcon = ROLE_BADGE_ICONS[employee.role]
  const deptName = employeeDeptDisplay(employee)
  const teamName = employeeTeamsDisplay(employee)

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-gradient-to-b from-slate-50/80 via-app-canvas to-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6 pt-6 md:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pt-8">
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
            <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={onDemoAction('Đổi phòng ban: kết nối API sau.')}
              >
                Đổi PB
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={onDemoAction('Đổi role: kết nối API sau.')}
              >
                Role
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-primary/10 bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="relative mx-auto">
              <EmployeeAvatar
                name={employee.name}
                showOnlineDot={employee.status === 'ACTIVE'}
                className="h-44 w-44 rounded-2xl border-[3px] border-white text-4xl shadow-[var(--shadow-game-float)] ring-4 ring-primary/15"
              />
            </div>

            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Phân công
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {deptName}
                    </span>
                    <span className="shrink-0 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                      Chính
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    VP · Ngân hàng TMCP Ngoại thương VCB
                  </p>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {teamName}
                    </span>
                    <span className="shrink-0 rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      Phụ
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mã {empCode} · Vào {new Date(employee.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
              variant="outline"
              size="sm"
              onClick={onDemoAction('Đổi phòng ban: kết nối API sau.')}
            >
              Đổi phòng ban
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDemoAction('Đổi role: kết nối API sau.')}
            >
              Đổi role
            </Button>
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

          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/5">
            <div className="border-b border-border/80 px-5 py-5 md:px-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                {employee.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Building2
                  className="h-4 w-4 shrink-0 text-primary/70"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>
                  {deptName} · {teamName}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-primary md:text-xl">
                {ROLE_LABEL_VI[employee.role]} · {LEVEL_LABELS[employee.currentLevel as LevelCode]}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {profileScoreDisplay}
                </span>
                <FiveStarRank filled={rankStarsFive} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary ring-1 ring-primary/15">
                    <Star className="h-3.5 w-3.5" variant="filled" />
                    {points.toLocaleString('vi-VN')} pts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-500/20">
                    <Crown className="h-3.5 w-3.5 text-amber-600" strokeWidth={2} />#{rank}
                  </span>
                </div>
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
                  <Award className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
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

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="button" className="gap-2" onClick={() => setTab(4)}>
                  Chỉnh sửa hồ sơ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => toast.info('Cài đặt nhân viên (demo)')}
                  aria-label="Cài đặt"
                >
                  <Settings className="h-5 w-5" strokeWidth={2} />
                </Button>
              </div>
            </div>

            <nav
              className="flex flex-wrap gap-0 border-b border-border px-2 md:px-4"
              aria-label="Mục hồ sơ nhân viên"
            >
              {tabLabels.map((label, i) => {
                const Icon = tabIcons[i]!
                const active = tab === i
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTab(i)}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors md:px-4',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2} />
                    {label}
                    {active ? (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary md:left-4 md:right-4" />
                    ) : null}
                  </button>
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
                  editName={editName}
                  editEmail={editEmail}
                  editRole={editRole}
                  editDepartmentId={editDepartmentId}
                  editTeamId={editTeamId}
                  editPhone={editPhone}
                  editBirthDate={editBirthDate}
                  editStartDate={editStartDate}
                  editSecondaryTeamId={editSecondaryTeamId}
                  editCurrentLevel={editCurrentLevel}
                  empCode={empCode}
                  onName={setEditName}
                  onEmail={setEditEmail}
                  onRole={setEditRole}
                  onDepartmentId={setEditDepartmentId}
                  onTeamId={setEditTeamId}
                  onPhone={setEditPhone}
                  onBirthDate={setEditBirthDate}
                  onStartDate={setEditStartDate}
                  onSecondaryTeamId={setEditSecondaryTeamId}
                  onCurrentLevel={setEditCurrentLevel}
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
                { Icon: ClipboardList, label: 'Bài đã nộp (gần nhất)', value: '18' },
                { Icon: CheckCircle2, label: 'Tỉ lệ đạt', value: '83%' },
                { Icon: GraduationCap, label: 'Kỳ thi đã qua', value: '6' },
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
          <div className="grid grid-cols-2 gap-2">
            {[
              ['⚡', 'Hoàn thành nhanh', 'Đạt lần 1'],
              ['🎓', 'Mentor', 'Kèm mentee'],
              ['🏆', 'Top Learner', 'Top 15%'],
              ['👑', 'Tướng', 'Chưa mở'],
            ].map(([icon, name, sub], i) => (
              <div
                key={name}
                className={cn(
                  'rounded-xl border p-2.5 text-center',
                  CARD_ENTRANCE_HOVER,
                  i < 3
                    ? 'border-primary/30 bg-gradient-to-br from-app-canvas to-primary/10'
                    : 'opacity-40 grayscale'
                )}
                style={staggerStyle(i + 2)}
              >
                <div className="text-[22px]">{icon}</div>
                <div className="text-xs font-bold text-foreground md:text-sm">{name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground md:text-sm">{sub}</div>
              </div>
            ))}
          </div>
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
            <div className="text-[9px] font-semibold uppercase text-muted-foreground">{l}</div>
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
  editName,
  editEmail,
  editRole,
  editDepartmentId,
  editTeamId,
  editPhone,
  editBirthDate,
  editStartDate,
  editSecondaryTeamId,
  editCurrentLevel,
  empCode,
  onName,
  onEmail,
  onRole,
  onDepartmentId,
  onTeamId,
  onPhone,
  onBirthDate,
  onStartDate,
  onSecondaryTeamId,
  onCurrentLevel,
  canEdit,
  canDeactivate,
  isSaving,
  onSave,
  onDeactivate,
  onReactivate,
}: {
  employee: EmployeeEntity
  editName: string
  editEmail: string
  editRole: Role
  editDepartmentId: string
  editTeamId: string
  editPhone: string
  editBirthDate: string
  editStartDate: string
  editSecondaryTeamId: string
  editCurrentLevel: EmployeeEntity['currentLevel']
  empCode: string
  onName: (v: string) => void
  onEmail: (v: string) => void
  onRole: (v: Role) => void
  onDepartmentId: (v: string) => void
  onTeamId: (v: string) => void
  onPhone: (v: string) => void
  onBirthDate: (v: string) => void
  onStartDate: (v: string) => void
  onSecondaryTeamId: (v: string) => void
  onCurrentLevel: (v: EmployeeEntity['currentLevel']) => void
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

  const departmentOptions = useMemo(() => {
    const base = [...orgSel.departments]
    if (editDepartmentId && !base.some((o) => o.value === editDepartmentId)) {
      return [
        { value: editDepartmentId, label: `Phòng ban (${shortId(editDepartmentId)})` },
        ...base,
      ]
    }
    return base
  }, [orgSel.departments, editDepartmentId])

  const teamOptions = useMemo(() => {
    const fromDept = orgSel.teamsByDept.get(editDepartmentId) ?? []
    const base = [...fromDept]
    if (editTeamId && !base.some((o) => o.value === editTeamId)) {
      return [{ value: editTeamId, label: `Nhóm (${shortId(editTeamId)})` }, ...base]
    }
    return base
  }, [orgSel.teamsByDept, editDepartmentId, editTeamId])

  const secondaryTeamOptions = useMemo(() => {
    const base = [...orgSel.allTeams]
    const v = editSecondaryTeamId.trim()
    if (v && !base.some((o) => o.value === v)) {
      return [{ value: v, label: `Nhóm phụ (${shortId(v)})` }, ...base]
    }
    return base
  }, [orgSel.allTeams, editSecondaryTeamId])

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

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <PfCard title="Phân công tổ chức" entranceIndex={0}>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Role</label>
          <select
            className={cn(PROFILE_EDIT_SELECT, 'mb-3')}
            value={editRole}
            disabled={orgDisabled}
            onChange={(e) => onRole(e.target.value as Role)}
          >
            {roleSelectOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL_VI[r]}
              </option>
            ))}
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Phòng ban
          </label>
          <select
            className={cn(PROFILE_EDIT_SELECT, 'mb-3')}
            value={editDepartmentId}
            disabled={orgDisabled}
            onChange={(e) => onDepartmentId(e.target.value)}
          >
            {departmentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Team chính
          </label>
          <select
            className={cn(PROFILE_EDIT_SELECT, 'mb-3')}
            value={editTeamId}
            disabled={orgDisabled}
            onChange={(e) => onTeamId(e.target.value)}
          >
            {teamOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Team phụ (tùy chọn)
          </label>
          <select
            className={cn(PROFILE_EDIT_SELECT, 'mb-3')}
            value={editSecondaryTeamId}
            disabled={orgDisabled}
            onChange={(e) => onSecondaryTeamId(e.target.value)}
          >
            <option value="">— Không gán —</option>
            {secondaryTeamOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Ngày bắt đầu
          </label>
          <Input
            type="date"
            className={cn(PROFILE_EDIT_FIELD, 'mb-3')}
            value={editStartDate}
            disabled={orgDisabled}
            onChange={(e) => onStartDate(e.target.value)}
          />
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Cấp năng lực (career)
          </label>
          <select
            className={PROFILE_EDIT_SELECT}
            value={editCurrentLevel}
            disabled={orgDisabled}
            onChange={(e) => onCurrentLevel(e.target.value as EmployeeEntity['currentLevel'])}
          >
            {levelSelectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Họ và tên
            </label>
            <Input
              className={PROFILE_EDIT_FIELD}
              value={editName}
              disabled={orgDisabled}
              onChange={(e) => onName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
            <Input
              type="email"
              className={PROFILE_EDIT_FIELD}
              value={editEmail}
              disabled={orgDisabled}
              onChange={(e) => onEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Số điện thoại
            </label>
            <Input
              className={PROFILE_EDIT_FIELD}
              value={editPhone}
              disabled={orgDisabled}
              placeholder="09xx xxx xxx"
              onChange={(e) => onPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Ngày sinh
            </label>
            <Input
              type="date"
              className={PROFILE_EDIT_FIELD}
              value={editBirthDate}
              disabled={orgDisabled}
              onChange={(e) => onBirthDate(e.target.value)}
            />
          </div>
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
