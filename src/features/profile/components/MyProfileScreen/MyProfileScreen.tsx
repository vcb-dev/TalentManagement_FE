import { useId, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { useForm, useWatch, type Control } from 'react-hook-form'
import { toast } from 'sonner'
import { Building2, RefreshCw, Upload } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { StarEmblem } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'
import {
  DateController,
  InputController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { cn } from '@/lib/utils'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'
import { useAuthStore } from '@/stores/auth.store'
import { type PatchMeUserBody, usePatchMeUser, useUploadMePortrait } from '@/features/profile/hooks'
import type { MyProfilePage } from '@/features/profile/types'
import {
  formatUserDateForReadonlyDisplay,
  parseStoredDateToInputValue,
} from '@/features/profile/profileDateUtils'
import type {
  MeUserDisplayKey,
  MeUserPatchKey,
  MeUserSelf,
} from '@/features/profile/userSelf.types'
import { ME_USER_PATCH_KEYS } from '@/features/profile/userSelf.types'
import {
  USER_SELF_FORM_SECTIONS,
  isDateFormField,
  isWorkOrgReadonlyField,
  type UserSelfFieldSpec,
} from '@/features/profile/userSelfFormLayout'

export interface MyProfileScreenProps {
  page: MyProfilePage | undefined
  isLoading: boolean
}

const inputEditable =
  'border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10'

const fieldControlClass =
  'h-10 w-full rounded-xl border px-3 py-2 leading-snug outline-none transition-all'

const fieldStackGap = 'gap-1'
const fieldBoxClass = ''

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-slate-300" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {children}
      </span>
    </span>
  )
}

function SectionTitle({
  children,
  icon,
  variant = 'primary',
}: {
  children: string
  icon?: React.ReactNode
  variant?: 'primary' | 'indigo' | 'violet' | 'emerald'
}) {
  const configs = {
    primary: 'bg-primary/10 text-primary',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg font-bold',
          configs[variant]
        )}
      >
        {icon || <Building2 className="h-4 w-4" />}
      </div>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
        {children}
      </h3>
    </div>
  )
}

function workOrgReadonlyValue(u: MeUserSelf, key: MeUserDisplayKey): string {
  if (key === 'startDateWork') return formatUserDateForReadonlyDisplay(u.startDateWork)
  const v = u[key]
  return v == null ? '—' : String(v)
}

function mapCurrentTitleToLevelId(
  title: string
): 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong' {
  const normalized = title.trim().toLowerCase()
  if (normalized.includes('tập sự') || normalized.includes('tap su')) return 'tap_su'
  if (normalized.includes('biết việc') || normalized.includes('biet viec')) return 'biet_viec'
  if (normalized.includes('được việc') || normalized.includes('duoc viec')) return 'duoc_viec'
  if (normalized.includes('đóng góp') || normalized.includes('dong gop')) return 'dong_gop_ket_qua'
  if (normalized.includes('tướng') || normalized.includes('tuong')) return 'tuong'
  return 'biet_viec'
}

type EditRecord = Record<MeUserPatchKey, string>

function emptyEditRecord(): EditRecord {
  return Object.fromEntries(ME_USER_PATCH_KEYS.map((k) => [k, ''])) as EditRecord
}

function userToEdit(u: MeUserSelf): EditRecord {
  const r = emptyEditRecord()
  for (const k of ME_USER_PATCH_KEYS) {
    if (isDateFormField(k)) {
      r[k] = parseStoredDateToInputValue(u[k])
    } else {
      r[k] = u[k] == null ? '' : String(u[k])
    }
  }
  return r
}

function toPatch(edit: EditRecord): PatchMeUserBody {
  const nz = (s: string) => (s.trim() === '' ? null : s.trim())
  const body = {} as PatchMeUserBody
  for (const k of ME_USER_PATCH_KEYS) {
    body[k] = nz(edit[k] ?? '')
  }
  return body
}

function ProfileReadonlyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30',
        fieldStackGap
      )}
    >
      <FieldLabel>{label}</FieldLabel>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value || '—'}</p>
    </div>
  )
}

function renderField(
  field: UserSelfFieldSpec,
  ctx: {
    u: MeUserSelf
    control: ReturnType<typeof useForm<EditRecord>>['control']
  }
) {
  const { u, control } = ctx
  const forceReadonly = field.key === 'directManager'

  if (field.kind === 'portrait') {
    return null
  }

  if (isWorkOrgReadonlyField(field.key) || forceReadonly) {
    return (
      <ProfileReadonlyInfo
        key={field.key}
        label={field.label}
        value={workOrgReadonlyValue(u, field.key)}
      />
    )
  }

  const key = field.key as MeUserPatchKey

  if (isDateFormField(field.key)) {
    return (
      <DateController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        className={cn('space-y-1.5', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        datePickerClassName={cn(fieldControlClass, '[color-scheme:light]', inputEditable)}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      />
    )
  }

  if (field.multiline) {
    return (
      <TextareaController
        key={field.key}
        control={control}
        name={key}
        label={field.label}
        className={cn('space-y-1.5 sm:col-span-2 lg:col-span-2', fieldBoxClass)}
        labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
        textareaClassName={cn(
          'min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10',
          inputEditable
        )}
        customLabel={<FieldLabel>{field.label}</FieldLabel>}
      />
    )
  }

  return (
    <InputController
      key={field.key}
      control={control}
      name={key}
      label={field.label}
      type="text"
      autoComplete="off"
      className={cn('space-y-1.5', fieldBoxClass)}
      labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500"
      inputClassName={cn(fieldControlClass, inputEditable)}
      customLabel={<FieldLabel>{field.label}</FieldLabel>}
    />
  )
}

function ProfileIdentityCard({
  control,
  u,
  role,
  currentLevelTitle,
  portraitUploading,
  avatarUploadInputId,
  onPortraitFile,
  fallbackUserName,
  fallbackUserEmail,
}: {
  control: Control<EditRecord>
  u: MeUserSelf
  role: keyof typeof ROLE_LABEL_VI
  currentLevelTitle: string
  portraitUploading: boolean
  avatarUploadInputId: string
  onPortraitFile: (file: File) => void
  fallbackUserName: string
  fallbackUserEmail: string
}) {
  const watchedDisplayName = useWatch({ control, name: 'displayName' }) ?? ''
  const watchedFullNameLegal = useWatch({ control, name: 'fullNameLegal' }) ?? ''
  const portraitRef = useWatch({ control, name: 'portraitRef' }) ?? ''

  const displayName = useMemo(() => {
    const fromForm = watchedDisplayName.trim() || watchedFullNameLegal.trim()
    if (fromForm) return fromForm
    return u.displayName?.trim() || u.fullNameLegal?.trim() || fallbackUserName || 'Nhân viên'
  }, [fallbackUserName, u, watchedDisplayName, watchedFullNameLegal])

  const email = useMemo(() => {
    return u.email?.trim() || fallbackUserEmail || '—'
  }, [u, fallbackUserEmail])

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white shadow-xl md:h-28 md:w-28 dark:border-slate-800">
          <EmployeeAvatar
            name={displayName}
            photoUrl={resolvePublicAssetUrl(portraitRef)}
            className="h-full w-full object-cover text-2xl"
          />
          {portraitUploading && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <RefreshCw className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <Input
            id={avatarUploadInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={portraitUploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPortraitFile(f)
              e.target.value = ''
            }}
          />
          <label
            htmlFor={avatarUploadInputId}
            className={cn(
              'absolute bottom-1 right-1 z-[2] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-white transition-transform hover:scale-110 hover:bg-primary/90 active:scale-95 dark:ring-slate-900',
              'md:bottom-1.5 md:right-1.5',
              portraitUploading && 'pointer-events-none opacity-50'
            )}
            aria-label="Tải ảnh đại diện"
          >
            <Upload className="h-4 w-4" strokeWidth={2.25} />
          </label>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {displayName}
          </h2>
          <p className="text-sm font-medium text-slate-500">{email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 border-indigo-400/30 bg-indigo-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"
          >
            {ROLE_LABEL_VI[role]}
          </Badge>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Building2 className="h-3 w-3" />
            <span>
              {u.departmentName?.trim() || '—'} · {u.teamGroup?.trim() || '—'}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-fuchsia-400/30 bg-fuchsia-500/10 px-2 text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300"
          >
            Cấp độ: {currentLevelTitle}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function MyProfileScreenLoaded({ page, u }: { page: MyProfilePage; u: MeUserSelf }) {
  const user = useAuthStore((s) => s.user)
  const { mutate: patchUser, isPending: patchPending } = usePatchMeUser()
  const { mutate: uploadPortrait, isPending: portraitUploading } = useUploadMePortrait()
  const form = useForm<EditRecord>({
    defaultValues: userToEdit(u),
  })
  const { control, handleSubmit } = form

  const role = user?.role ?? 'MEMBER'
  const totalStars = Math.max(page.currentLevel.totalStars || 0, 0)
  const filledStars = Math.min(Math.max(page.currentLevel.filledStars || 0, 0), totalStars)
  const levelProgressPct = Math.max(0, Math.min(100, page.currentLevel.levelProgressPct || 0))
  const learningPathSearch = useMemo(
    () => ({
      levelId: page.placement?.levelId ?? mapCurrentTitleToLevelId(page.currentLevel.title),
      starId: page.placement?.starId ?? Math.max(1, page.currentLevel.currentStarIndex || 1),
    }),
    [
      page.placement?.levelId,
      page.placement?.starId,
      page.currentLevel.title,
      page.currentLevel.currentStarIndex,
    ]
  )

  const onPortraitFile = (file: File) => {
    uploadPortrait(file, {
      onSuccess: (res) => {
        toast.success('Đã cập nhật ảnh đại diện')
        form.setValue('portraitRef', res.portraitRef)
        // Cập nhật vào auth store để Navbar thay đổi ngay
        if (user) {
          useAuthStore.getState().setUser({
            ...user,
            portraitRef: res.portraitRef,
          })
        }
      },
      onError: () => toast.error('Không tải được ảnh. Thử lại sau.'),
    })
  }

  const workSection = USER_SELF_FORM_SECTIONS[0]!
  const workReadonlyFields = workSection.fields.filter(
    (field) => isWorkOrgReadonlyField(field.key) || field.key === 'directManager'
  )
  const workEditableFields = workSection.fields.filter(
    (field) => !isWorkOrgReadonlyField(field.key) && field.key !== 'directManager'
  )
  const detailSections = USER_SELF_FORM_SECTIONS.slice(1).filter((s) => s.title.trim() !== 'Khác')
  const detailSectionVariants: ('indigo' | 'violet' | 'emerald' | 'primary')[] = [
    'indigo',
    'violet',
    'emerald',
    'primary',
    'indigo',
  ]
  const onSaveProfile = handleSubmit((values) =>
    patchUser(toPatch(values), {
      onSuccess: () => toast.success('Đã lưu'),
      onError: () => toast.error('Không lưu được. Thử lại sau.'),
    })
  )

  const fieldCtx = { u, control }
  const avatarUploadInputId = useId()

  return (
    <Form {...form}>
      <div className="relative -m-5 min-h-[calc(100vh-3rem)] bg-slate-50/50 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-6 text-foreground md:-m-6 md:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:-m-8 dark:bg-slate-950">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-8 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
          <div className="mb-8 border-none bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-2xl rounded-3xl relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 [mask-image:linear-gradient(to_left,white,transparent)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                  Hồ sơ cá nhân
                </h1>
                <p className="text-blue-50/80 max-w-2xl font-medium">
                  Quản lý thông tin nhân sự và lộ trình phát triển.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 h-48 w-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="relative z-10">
                  <ProfileIdentityCard
                    control={control}
                    u={u}
                    role={role}
                    currentLevelTitle={page.currentLevel.title}
                    portraitUploading={portraitUploading}
                    avatarUploadInputId={avatarUploadInputId}
                    onPortraitFile={onPortraitFile}
                    fallbackUserName={user?.name ?? ''}
                    fallbackUserEmail={user?.email ?? ''}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
                <div className="mb-8 flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                  <h2 className="text-xl font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
                    Chi tiết hồ sơ
                  </h2>
                </div>

                <div className="space-y-8">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-6 dark:border-blue-900/20 dark:bg-blue-900/10">
                    <SectionTitle variant="primary">{workSection.title}</SectionTitle>
                    {workReadonlyFields.length > 0 ? (
                      <div className="mb-8">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-blue-600/60">
                          Thông tin đồng bộ (chỉ xem)
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {workReadonlyFields.map((f) => renderField(f, fieldCtx))}
                        </div>
                      </div>
                    ) : null}
                    {workEditableFields.length > 0 ? (
                      <div className="border-t border-blue-100/50 pt-6 dark:border-blue-800/50">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-blue-600/60">
                          Thông tin có thể cập nhật
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {workEditableFields.map((f) => renderField(f, fieldCtx))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {detailSections.map((section, idx) => (
                    <div
                      key={section.title}
                      className={cn(
                        'rounded-2xl border p-6',
                        idx % 3 === 0
                          ? 'border-indigo-100 bg-indigo-50/20 dark:border-indigo-900/20 dark:bg-indigo-900/10'
                          : idx % 3 === 1
                            ? 'border-violet-100 bg-violet-50/20 dark:border-violet-900/20 dark:bg-violet-900/10'
                            : 'border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/20 dark:bg-emerald-900/10'
                      )}
                    >
                      <SectionTitle variant={detailSectionVariants[idx]}>
                        {section.title}
                      </SectionTitle>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {section.fields.map((f) => renderField(f, fieldCtx))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-8 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:to-orange-950/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 blur-xl" />
                <div className="mb-6 flex items-center gap-4 relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-none">
                    <StarEmblem variant="filled" className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">
                      Lộ trình hiện tại
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 truncate">
                      {page.currentLevel.progressLine}
                    </p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700/80">
                      <span>Tiến độ cấp độ</span>
                      <span className="text-amber-600 bg-white px-1.5 py-0.5 rounded-md shadow-sm">
                        {levelProgressPct}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-900/30 ring-4 ring-amber-100/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        style={{ width: `${levelProgressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-amber-200/50 pt-6 dark:border-amber-900/20">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sao hiện tại
                    </div>
                    <div className="text-lg font-black text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-lg">
                      {page.currentLevel.currentStarIndex}
                      <span className="text-slate-400 text-xs mx-0.5">/</span>
                      {totalStars}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: totalStars }, (_, i) => (
                      <StarEmblem
                        key={i}
                        variant={i < filledStars ? 'filled' : 'muted'}
                        className={cn(
                          'h-7 w-7 transition-all duration-300',
                          i < filledStars
                            ? 'drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)] hover:scale-110'
                            : 'opacity-20 grayscale hover:opacity-40'
                        )}
                        alt={i < filledStars ? `Sao đã đạt ${i + 1}` : `Sao chưa đạt ${i + 1}`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl border-amber-200 bg-white text-xs font-semibold uppercase tracking-wider text-amber-700 shadow-sm transition-all hover:bg-amber-500 hover:text-white hover:border-amber-500 dark:border-amber-900/50 dark:bg-slate-900"
                      asChild
                    >
                      <Link to="/learning-path" search={learningPathSearch}>
                        Lộ trình
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl border-amber-200 bg-white text-xs font-semibold uppercase tracking-wider text-amber-700 shadow-sm transition-all hover:bg-amber-500 hover:text-white hover:border-amber-500 dark:border-amber-900/50 dark:bg-slate-900"
                      asChild
                    >
                      <Link to="/exam">Kết quả thi</Link>
                    </Button>
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-center text-xs leading-relaxed text-slate-400 font-medium italic">
                  * Thông tin được đồng bộ tự động từ hệ thống HRM và Lark. Các trường bị khóa không
                  thể chỉnh sửa trực tiếp tại đây.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]"
              role="presentation"
            >
              <div
                className="pointer-events-auto border-t border-slate-200/90 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
                role="region"
                aria-label="Lưu hồ sơ"
              >
                <div className="mx-auto flex w-full max-w-[1400px] justify-stretch sm:justify-end">
                  <Button
                    type="button"
                    disabled={patchPending}
                    onClick={onSaveProfile}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:min-w-[220px] sm:px-8"
                  >
                    {patchPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </Form>
  )
}

export function MyProfileScreen({ page, isLoading }: MyProfileScreenProps) {
  const u = page?.userRecord

  if (isLoading || !page || !u) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] items-center justify-center bg-slate-50/50 p-8 text-muted-foreground md:-m-6 lg:-m-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
            <span className="font-bold tracking-wide text-xs uppercase">Đang tải hồ sơ…</span>
          </div>
        ) : (
          'Không có dữ liệu'
        )}
      </div>
    )
  }

  return <MyProfileScreenLoaded key={`${u.id}-${u.updatedAt}`} page={page} u={u} />
}
