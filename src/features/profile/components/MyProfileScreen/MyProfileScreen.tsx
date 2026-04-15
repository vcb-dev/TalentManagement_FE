import { useId, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { toast } from 'sonner'
import { Building2, Upload } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
import { StarEmblem } from '@/components/icons'
import { Button } from '@/components/ui/button'
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
  'border-primary/35 bg-slate-200/95 text-[0.9375rem] ring-offset-background placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60'

const fieldControlClass =
  'min-h-12 w-full rounded-xl border px-4 py-3 leading-snug outline-none transition-colors'

const fieldStackGap = 'gap-1.5'
const fieldBoxClass = ''

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span
        className="h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary via-sky-500 to-accent shadow-[0_0_10px_-2px_hsl(var(--primary)/0.55)]"
        aria-hidden
      />
      <span className="min-w-0 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold tracking-wide text-primary ring-1 ring-primary/20">
        {children}
      </span>
    </span>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="flex items-center gap-3 border-b border-primary/20 pb-3">
      <span
        className="h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary via-primary-600 to-accent"
        aria-hidden
      />
      <span className="min-w-0 text-base font-bold tracking-tight text-foreground">
        <span className="bg-gradient-to-r from-primary via-primary-600 to-accent bg-clip-text text-transparent">
          {children}
        </span>
      </span>
    </h3>
  )
}

function workOrgReadonlyValue(u: MeUserSelf, key: MeUserDisplayKey): string {
  if (key === 'startDateWork') return formatUserDateForReadonlyDisplay(u.startDateWork)
  const v = u[key]
  return v == null ? '' : String(v)
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
        'flex min-h-12 flex-col justify-center rounded-xl border border-border/70 bg-muted/35 px-4 py-3',
        fieldStackGap
      )}
    >
      <FieldLabel>{label}</FieldLabel>
      <p className="text-[0.95rem] font-medium leading-snug text-foreground/85">{value || '—'}</p>
    </div>
  )
}

function ProfileEditableText({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className={cn('flex flex-col', fieldStackGap, fieldBoxClass)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        autoComplete="off"
        className={cn(fieldControlClass, inputEditable)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ProfileEditableTextarea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label
      className={cn('flex flex-col sm:col-span-2 lg:col-span-2', fieldStackGap, fieldBoxClass)}
    >
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className={cn(
          'min-h-[128px] w-full resize-y rounded-xl border px-4 py-3 text-[0.9375rem] leading-relaxed outline-none transition-colors focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring',
          inputEditable
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ProfileEditableDate({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className={cn('flex flex-col', fieldStackGap, fieldBoxClass)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        className={cn(fieldControlClass, '[color-scheme:light]', inputEditable)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
      <Controller
        key={field.key}
        control={control}
        name={key}
        render={({ field: rhfField }) => (
          <ProfileEditableDate
            label={field.label}
            value={rhfField.value ?? ''}
            onChange={rhfField.onChange}
          />
        )}
      />
    )
  }

  if (field.multiline) {
    return (
      <Controller
        key={field.key}
        control={control}
        name={key}
        render={({ field: rhfField }) => (
          <ProfileEditableTextarea
            label={field.label}
            value={rhfField.value ?? ''}
            onChange={rhfField.onChange}
          />
        )}
      />
    )
  }

  return (
    <Controller
      key={field.key}
      control={control}
      name={key}
      render={({ field: rhfField }) => (
        <ProfileEditableText
          label={field.label}
          value={rhfField.value ?? ''}
          onChange={rhfField.onChange}
        />
      )}
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
    <div className="flex flex-wrap items-center gap-4">
      <div className="group relative shrink-0">
        <EmployeeAvatar
          name={displayName}
          photoUrl={resolvePublicAssetUrl(portraitRef)}
          className="h-20 w-20 shrink-0 rounded-3xl text-lg ring-4 ring-primary/30 shadow-[0_18px_30px_-20px_hsl(var(--primary)/0.75)] md:h-24 md:w-24 md:text-xl"
        />
        <input
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
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(
            'absolute -bottom-2 left-1/2 h-8 -translate-x-1/2 rounded-full px-3 text-xs shadow-sm',
            portraitUploading && 'pointer-events-none'
          )}
        >
          <label htmlFor={avatarUploadInputId}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {portraitUploading ? 'Đang tải…' : 'Đổi ảnh'}
          </label>
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold leading-tight">{displayName}</p>
        <p className="mt-1 text-base text-muted-foreground">{email}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary ring-1 ring-primary/15">
            {ROLE_LABEL_VI[role]}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              {u.departmentName?.trim() || '—'} · {u.teamGroup?.trim() || '—'}
            </span>
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cấp độ
          </span>
          <span className="text-sm font-semibold text-primary">{currentLevelTitle}</span>
        </div>
      </div>
    </div>
  )
}

function MyProfileScreenLoaded({ page, u }: { page: MyProfilePage; u: MeUserSelf }) {
  const user = useAuthStore((s) => s.user)
  const { mutate: patchUser, isPending: patchPending } = usePatchMeUser()
  const { mutate: uploadPortrait, isPending: portraitUploading } = useUploadMePortrait()
  const { control, handleSubmit } = useForm<EditRecord>({
    defaultValues: userToEdit(u),
  })

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
      onSuccess: () => toast.success('Đã cập nhật ảnh đại diện'),
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
  const onSaveProfile = handleSubmit((values) =>
    patchUser(toPatch(values), {
      onSuccess: () => toast.success('Đã lưu'),
      onError: () => toast.error('Không lưu được. Thử lại sau.'),
    })
  )

  const fieldCtx = { u, control }
  const avatarUploadInputId = useId()

  return (
    <div className="relative -m-5 overflow-hidden bg-app-canvas pb-12 pt-6 text-foreground md:-m-6 lg:-m-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_60%_at_50%_-10%,hsl(var(--primary)/0.14),transparent_58%),radial-gradient(ellipse_70%_46%_at_100%_38%,hsl(var(--accent)/0.12),transparent_58%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[min(100%,80rem)] px-4 md:px-6">
        <header className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-primary via-primary-600 to-accent bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Hồ sơ cá nhân
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Cập nhật hồ sơ cá nhân và theo dõi lộ trình phát triển ngay trong một màn hình. Nhấn{' '}
              <span className="font-medium text-foreground">Lưu thay đổi</span> để gửi lên hệ thống;
              dữ liệu đồng bộ HR có thể ghi đè theo lịch.
            </p>
          </div>
          <button
            type="button"
            disabled={patchPending}
            onClick={onSaveProfile}
            className="hidden h-12 shrink-0 rounded-xl bg-gradient-to-r from-primary via-primary-600 to-accent px-8 text-base font-semibold text-primary-foreground shadow-[0_14px_34px_-18px_hsl(var(--primary)/0.55)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 sm:inline-flex sm:min-w-[210px] sm:items-center sm:justify-center"
          >
            {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </header>

        <section className="rounded-3xl border border-primary/15 bg-card/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-[2px] md:p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] xl:items-start">
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

            <aside className="rounded-2xl border border-border/70 bg-background/85 p-4">
              <div className="flex items-center gap-3">
                <StarEmblem
                  variant="filled"
                  className="h-10 w-10 shrink-0 drop-shadow-[0_4px_8px_rgba(212,160,23,0.35)]"
                  alt="Sao cấp độ"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {page.currentLevel.progressLine}
                  </p>
                  <p className="text-xs text-muted-foreground">Lộ trình hiện tại</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary-600 to-accent transition-all"
                  style={{ width: `${levelProgressPct}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Link
                  to="/learning-path"
                  search={learningPathSearch}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Lộ trình học
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link
                  to="/exam"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Kết quả thi
                </Link>
              </div>
            </aside>
          </div>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Sao hiện tại: {page.currentLevel.currentStarIndex}/{totalStars}
              </p>
              <p className="text-sm font-medium text-primary">{levelProgressPct}% tiến độ cấp</p>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {Array.from({ length: totalStars }, (_, i) => (
                <StarEmblem
                  key={i}
                  variant={i < filledStars ? 'filled' : 'muted'}
                  className={cn('h-6 w-6', i < filledStars ? 'drop-shadow-sm' : 'opacity-40')}
                  alt={i < filledStars ? `Sao đã đạt ${i + 1}` : `Sao chưa đạt ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-primary/12 bg-card/85 p-5 shadow-[var(--shadow-card)] backdrop-blur-[2px] md:p-6">
          <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <span
              className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_14px_-3px_hsl(var(--primary)/0.5)]"
              aria-hidden
            />
            <span className="bg-gradient-to-r from-primary via-foreground to-primary/80 bg-clip-text text-transparent">
              Chi tiết hồ sơ
            </span>
          </h2>

          <div className="mt-5 space-y-4">
            <div className="min-w-0 rounded-2xl border border-border/60 bg-background/75 p-4 md:p-5">
              <SectionTitle>{workSection.title}</SectionTitle>
              {workReadonlyFields.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thông tin đồng bộ (chỉ xem)
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {workReadonlyFields.map((f) => renderField(f, fieldCtx))}
                  </div>
                </div>
              ) : null}
              {workEditableFields.length > 0 ? (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thông tin có thể cập nhật
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {workEditableFields.map((f) => renderField(f, fieldCtx))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {detailSections.map((section) => (
                <div
                  key={section.title}
                  className="min-w-0 rounded-2xl border border-border/60 bg-background/75 p-4 md:p-5"
                >
                  <SectionTitle>{section.title}</SectionTitle>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {section.fields.map((f) => renderField(f, fieldCtx))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nhớ nhấn Lưu sau khi sửa. Đồng bộ Lark/HR có thể cập nhật lại một số trường theo lịch nội
          bộ.
        </p>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-card/95 px-4 py-3 shadow-[0_-8px_20px_-18px_hsl(var(--primary)/0.65)] backdrop-blur sm:hidden">
        <button
          type="button"
          disabled={patchPending}
          onClick={onSaveProfile}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-primary via-primary-600 to-accent px-5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  )
}

export function MyProfileScreen({ page, isLoading }: MyProfileScreenProps) {
  const u = page?.userRecord

  if (isLoading || !page || !u) {
    return (
      <div className="-m-5 flex min-h-[calc(100vh-3rem)] items-center justify-center bg-app-canvas p-8 text-muted-foreground md:-m-6 lg:-m-8">
        {isLoading ? 'Đang tải hồ sơ…' : 'Không có dữ liệu'}
      </div>
    )
  }

  return <MyProfileScreenLoaded key={`${u.id}-${u.updatedAt}`} page={page} u={u} />
}
