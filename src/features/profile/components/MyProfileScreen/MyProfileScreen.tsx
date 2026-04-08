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
  'border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'

const inputReadOnly =
  'cursor-not-allowed border-muted bg-muted/70 text-muted-foreground shadow-none'

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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        readOnly
        disabled
        autoComplete="off"
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
          inputReadOnly
        )}
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        autoComplete="off"
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
          inputEditable
        )}
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
    <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        className={cn(
          'min-h-[88px] w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="date"
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors [color-scheme:light]',
          inputEditable
        )}
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
    <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
      <span id={titleId} className="text-xs font-medium text-muted-foreground">
        {label}
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
          'flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-2 text-sm transition-colors',
          'hover:border-primary/45 hover:bg-muted/25',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate font-medium text-foreground">
          {uploading ? 'Đang tải ảnh đại diện…' : 'Chọn ảnh đại diện'}
        </span>
      </label>
      <p className="text-[11px] leading-snug text-muted-foreground">
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

  if (isWorkOrgReadonlyField(field.key)) {
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
  const detailSections = USER_SELF_FORM_SECTIONS.slice(1)

  const fieldCtx = { u, edit, setEdit, onPortraitFile, portraitUploading }

  return (
    <div className="-m-5 bg-app-canvas pb-12 pt-6 text-foreground md:-m-6 lg:-m-8">
      <div className="mx-auto w-full max-w-[min(100%,96rem)] px-4 md:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ cá nhân</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
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
            className="h-11 shrink-0 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:min-w-[180px]"
          >
            {patchPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <EmployeeAvatar
                name={displayName}
                photoUrl={resolvePublicAssetUrl(edit.portraitRef)}
                className="h-16 w-16 shrink-0 rounded-xl text-base ring-2 ring-border"
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-tight">{displayName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
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

          <section className="rounded-lg border border-dashed border-border bg-muted/25 px-4 py-3 text-sm">
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
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Lộ trình học
              </Link>
              <span className="text-muted-foreground"> · </span>
              <Link
                to="/exam"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Kết quả thi
              </Link>
            </p>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold">Chi tiết hồ sơ</h2>

          <div className="mt-6 space-y-12">
            <div className="min-w-0">
              <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                {workSection.title}
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {workSection.fields.map((f) => renderField(f, fieldCtx))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-x-10 2xl:gap-x-12">
              {detailSections.map((section) => (
                <div key={section.title} className="min-w-0">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {section.fields.map((f) => renderField(f, fieldCtx))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
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
