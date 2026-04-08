import { type Dispatch, type SetStateAction, useId, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Building2, Upload } from 'lucide-react'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'
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

const inputReadOnly =
  'cursor-not-allowed border-slate-400/80 bg-slate-200/95 text-foreground/80 shadow-none'

const fieldControlClass =
  'min-h-12 w-full rounded-xl border px-4 py-3 leading-snug outline-none transition-colors'

const fieldStackGap = 'gap-1.5'
const fieldBoxClass = ''
const fieldBoxReadonlyClass = ''

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

function ProfileReadonlyInput({ label, value }: { label: string; value: string }) {
  return (
    <label className={cn('flex flex-col', fieldStackGap, fieldBoxReadonlyClass)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        readOnly
        disabled
        autoComplete="off"
        className={cn(fieldControlClass, inputReadOnly)}
        value={value}
      />
    </label>
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
    <label className={cn('flex flex-col sm:col-span-2 lg:col-span-2', fieldStackGap, fieldBoxClass)}>
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

function PortraitUploadBlock({
  label,
  uploading,
  onFile,
}: {
  label: string
  uploading: boolean
  onFile: (file: File) => void
}) {
  const uploadInputId = useId()

  const titleId = `${uploadInputId}-title`

  return (
    <div className={cn('flex min-w-0 flex-col sm:col-span-2 lg:col-span-2', fieldStackGap, fieldBoxClass)}>
      <span id={titleId} className="block">
        <FieldLabel>{label}</FieldLabel>
      </span>
      <input
        id={uploadInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={uploading}
        aria-labelledby={titleId}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <label
        htmlFor={uploadInputId}
        className={cn(
          'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-muted/35 px-4 py-3 text-[0.9375rem] transition-colors',
          'hover:border-primary/55 hover:bg-muted/45',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <Upload className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate font-semibold text-foreground">
          {uploading ? 'Đang tải ảnh đại diện…' : 'Chọn ảnh đại diện'}
        </span>
      </label>
      <p className="text-xs leading-snug text-muted-foreground">
        JPEG, PNG, WebP hoặc GIF — tối đa 5 MB
      </p>
    </div>
  )
}

function renderField(
  field: UserSelfFieldSpec,
  ctx: {
    u: MeUserSelf
    edit: EditRecord
    setEdit: Dispatch<SetStateAction<EditRecord>>
    onPortraitFile: (file: File) => void
    portraitUploading: boolean
  }
) {
  const { u, edit, setEdit, onPortraitFile, portraitUploading } = ctx
  const forceReadonly = field.key === 'directManager'

  if (field.kind === 'portrait') {
    return (
      <PortraitUploadBlock
        key={field.key}
        label={field.label}
        uploading={portraitUploading}
        onFile={onPortraitFile}
      />
    )
  }

  if (isWorkOrgReadonlyField(field.key) || forceReadonly) {
    return (
      <ProfileReadonlyInput
        key={field.key}
        label={field.label}
        value={workOrgReadonlyValue(u, field.key)}
      />
    )
  }

  const key = field.key as MeUserPatchKey
  const setVal = (v: string) => setEdit((s) => ({ ...s, [key]: v }))

  if (isDateFormField(field.key)) {
    return (
      <ProfileEditableDate
        key={field.key}
        label={field.label}
        value={edit[key] ?? ''}
        onChange={setVal}
      />
    )
  }

  if (field.multiline) {
    return (
      <ProfileEditableTextarea
        key={field.key}
        label={field.label}
        value={edit[key] ?? ''}
        onChange={setVal}
      />
    )
  }

  return (
    <ProfileEditableText
      key={field.key}
      label={field.label}
      value={edit[key] ?? ''}
      onChange={setVal}
    />
  )
}

function MyProfileScreenLoaded({ page, u }: { page: MyProfilePage; u: MeUserSelf }) {
  const user = useAuthStore((s) => s.user)
  const { mutate: patchUser, isPending: patchPending } = usePatchMeUser()
  const { mutate: uploadPortrait, isPending: portraitUploading } = useUploadMePortrait()
  const [edit, setEdit] = useState(() => userToEdit(u))

  const role = user?.role ?? 'MEMBER'

  const displayName = useMemo(() => {
    const fromForm = edit.displayName.trim() || edit.fullNameLegal.trim()
    if (fromForm) return fromForm
    if (!u) return user?.name ?? 'Nhân viên'
    return u.displayName?.trim() || u.fullNameLegal?.trim() || user?.name || 'Nhân viên'
  }, [u, user?.name, edit.displayName, edit.fullNameLegal])

  const email = useMemo(() => {
    if (!u) return user?.email ?? '—'
    return u.email?.trim() || user?.email || '—'
  }, [u, user?.email])

  const onPortraitFile = (file: File) => {
    uploadPortrait(file, {
      onSuccess: () => toast.success('Đã cập nhật ảnh đại diện'),
      onError: () => toast.error('Không tải được ảnh. Thử lại sau.'),
    })
  }

  const workSection = USER_SELF_FORM_SECTIONS[0]!
  const detailSections = USER_SELF_FORM_SECTIONS.slice(1).filter((s) => s.title.trim() !== 'Khác')

  const fieldCtx = { u, edit, setEdit, onPortraitFile, portraitUploading }

  return (
    <div className="relative -m-5 overflow-hidden bg-app-canvas pb-12 pt-6 text-foreground md:-m-6 lg:-m-8">
      {/* Gamification background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.16),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_40%,hsl(var(--accent)/0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_0%_85%,hsl(var(--primary)/0.10),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-primary/18 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-28 h-96 w-96 rounded-full bg-accent/18 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25] [background-image:linear-gradient(hsl(var(--primary)/0.08)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.08)_1px,transparent_1px)] [background-size:56px_56px]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[min(100%,80rem)] px-4 md:px-6">
        <header className="relative mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-primary via-primary-600 to-accent bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Hồ sơ cá nhân
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Toàn bộ các trường dưới đây đều có thể chỉnh sửa khi vào trang. Nhấn{' '}
              <span className="font-medium text-foreground">Lưu thay đổi</span> để gửi lên hệ thống;
              ảnh đại diện có thể tải lên trực tiếp. Dữ liệu đồng bộ HR có thể ghi đè theo lịch.
            </p>
          </div>
          <button
            type="button"
            disabled={patchPending}
            onClick={() =>
              patchUser(toPatch(edit), {
                onSuccess: () => toast.success('Đã lưu'),
                onError: () => toast.error('Không lưu được. Thử lại sau.'),
              })
            }
            className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-primary via-primary-600 to-accent px-8 text-base font-semibold text-primary-foreground shadow-[0_14px_34px_-18px_hsl(var(--primary)/0.55)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 sm:min-w-[210px]"
          >
            {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-7">
          <section className="rounded-2xl border border-primary/15 bg-card/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-[2px]">
            <div className="flex flex-wrap items-start gap-4">
              <EmployeeAvatar
                name={displayName}
                photoUrl={resolvePublicAssetUrl(edit.portraitRef)}
                className="h-16 w-16 shrink-0 rounded-2xl text-base ring-4 ring-primary/15"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold leading-tight">{displayName}</p>
                <p className="mt-1 text-base text-muted-foreground">{email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-gradient-to-r from-primary/[0.12] to-accent/[0.10] px-3 py-1 font-semibold text-primary ring-1 ring-primary/15">
                    {ROLE_LABEL_VI[role]}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>
                      {edit.departmentName.trim() || '—'} · {edit.teamGroup.trim() || '—'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-accent/25 bg-card/85 px-5 py-4 text-base shadow-[var(--shadow-card)] backdrop-blur-[2px]">
            <p>
              <span className="text-muted-foreground">Cấp độ: </span>
              <span className="font-medium text-foreground">{page.currentLevel.title}</span>
              <span className="text-muted-foreground"> — </span>
              <span className="text-foreground/90">{page.currentLevel.progressLine}</span>
            </p>
            <p className="mt-2">
              <Link
                to="/learning-path"
                search={{ levelId: 'biet_viec', starId: 1 }}
                className="text-base font-semibold text-primary underline-offset-4 hover:underline"
              >
                Lộ trình học
              </Link>
              <span className="text-muted-foreground"> · </span>
              <Link
                to="/exam"
                className="text-base font-semibold text-primary underline-offset-4 hover:underline"
              >
                Kết quả thi
              </Link>
            </p>
          </section>
        </div>

        <section className="mt-7 rounded-3xl border border-primary/12 bg-card/80 p-5 shadow-[var(--shadow-card)] backdrop-blur-[2px] md:p-7">
          <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <span
              className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_14px_-3px_hsl(var(--primary)/0.5)]"
              aria-hidden
            />
            <span className="bg-gradient-to-r from-primary via-foreground to-primary/80 bg-clip-text text-transparent">
              Chi tiết hồ sơ
            </span>
          </h2>

          <div className="mt-5 space-y-6">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/65 p-4 shadow-sm md:p-5">
              <SectionTitle>{workSection.title}</SectionTitle>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {workSection.fields.map((f) => renderField(f, fieldCtx))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {detailSections.map((section) => (
                <div
                  key={section.title}
                  className="min-w-0 rounded-2xl border border-border/70 bg-background/65 p-4 shadow-sm md:p-5"
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
