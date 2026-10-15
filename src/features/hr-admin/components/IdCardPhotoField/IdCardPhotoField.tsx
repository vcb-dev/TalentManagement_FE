import { Button } from '@/components/ui/button'
import type { IdCardPhotoField } from '@/features/hr-admin/api'
import {
  useAnyActionPending,
  useAttachmentPreviewUrl,
  useUploadAttachment,
} from '@/features/hr-admin/hooks'
import { useMeAttachmentPreviewUrl, useUploadMeAttachment } from '@/features/profile/hooks'
import { getApiErrorMessage } from '@/lib/axios'
import { validateUploadFile } from '@/lib/fileUploadUtils'
import { cn } from '@/lib/utils'
import { IdCard, ImageUp, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { toast } from 'sonner'

const ID_CARD_PHOTO_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
/** Khớp `PRIVATE_DOC_MAX_BYTES` ở BE. */
const ID_CARD_PHOTO_MAX_BYTES = 10 * 1024 * 1024

function validateIdCardPhoto(file: File): string | null {
  if (!ID_CARD_PHOTO_ACCEPT.includes(file.type)) return 'Ảnh CCCD chỉ nhận JPG, PNG hoặc WebP'
  return validateUploadFile(file, { maxSizeBytes: ID_CARD_PHOTO_MAX_BYTES })
}

function IdCardPhotoBox({
  label,
  previewUrl,
  emptyText,
  hasPhoto,
  busy,
  disabled,
  onPick,
  onClear,
}: {
  label: ReactNode
  previewUrl: string | null
  emptyText: string
  hasPhoto: boolean
  busy?: boolean
  disabled?: boolean
  onPick: (file: File) => void
  onClear?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      {label}
      <div className="relative aspect-[1.586] w-full max-w-xs overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
        {previewUrl ? (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" title="Mở ảnh gốc">
            <img src={previewUrl} alt="" className="h-full w-full object-contain" />
          </a>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <IdCard className="h-7 w-7" aria-hidden />
            <span className="text-xs">{emptyText}</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <RefreshCw className="h-5 w-5 animate-spin text-white" aria-hidden />
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ID_CARD_PHOTO_ACCEPT.join(',')}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          const error = validateIdCardPhoto(file)
          if (error) {
            toast.error(error)
            return
          }
          onPick(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImageUp className="h-4 w-4" aria-hidden />
          {hasPhoto ? 'Thay ảnh' : 'Tải ảnh lên'}
        </Button>
        {onClear && hasPhoto ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-muted-foreground"
            disabled={disabled || busy}
            onClick={onClear}
          >
            <X className="h-4 w-4" aria-hidden />
            Bỏ chọn
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Chọn ảnh là tải lên ngay, không chờ "Lưu thay đổi". */
export function IdCardPhotoUploadField({
  employeeId,
  field,
  label,
  objectPath: initialObjectPath,
  canEdit,
}: {
  employeeId: string
  field: IdCardPhotoField
  label: ReactNode
  objectPath: string | null
  canEdit: boolean
}) {
  const [objectPath, setObjectPath] = useState(initialObjectPath)
  useEffect(() => setObjectPath(initialObjectPath), [initialObjectPath])

  const preview = useAttachmentPreviewUrl(employeeId, field, objectPath)
  const upload = useUploadAttachment()
  const anyActionPending = useAnyActionPending()

  const hasPhoto = Boolean(objectPath)
  const emptyText = !hasPhoto
    ? 'Chưa có ảnh'
    : preview.isLoading
      ? 'Đang tải ảnh…'
      : 'Không xem được ảnh'

  return (
    <IdCardPhotoBox
      label={label}
      previewUrl={preview.data?.signedUrl ?? null}
      emptyText={emptyText}
      hasPhoto={hasPhoto}
      busy={upload.isPending}
      disabled={!canEdit || anyActionPending}
      onPick={(file) =>
        upload.mutate(
          { id: employeeId, field, file },
          {
            onSuccess: (data) => {
              setObjectPath(data.objectPath)
              toast.success('Đã lưu ảnh CCCD')
            },
            onError: (err) => toast.error(getApiErrorMessage(err) || 'Không tải được ảnh CCCD'),
          }
        )
      }
    />
  )
}

export function MyIdCardPhotoUploadField({
  field,
  label,
  objectPath: initialObjectPath,
}: {
  field: IdCardPhotoField
  label: ReactNode
  objectPath: string | null
}) {
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const objectPath = uploadedPath ?? initialObjectPath

  const preview = useMeAttachmentPreviewUrl(field, objectPath)
  const upload = useUploadMeAttachment()
  const anyActionPending = useAnyActionPending()

  const hasPhoto = Boolean(objectPath)
  const emptyText = !hasPhoto
    ? 'Chưa có ảnh'
    : preview.isLoading
      ? 'Đang tải ảnh…'
      : 'Không xem được ảnh'

  return (
    <IdCardPhotoBox
      label={label}
      previewUrl={preview.data?.signedUrl ?? null}
      emptyText={emptyText}
      hasPhoto={hasPhoto}
      busy={upload.isPending}
      disabled={anyActionPending}
      onPick={(file) =>
        upload.mutate(
          { field, file },
          {
            onSuccess: (data) => {
              setUploadedPath(data.objectPath)
              toast.success('Đã lưu ảnh CCCD')
            },
            onError: (err) => toast.error(getApiErrorMessage(err) || 'Không tải được ảnh CCCD'),
          }
        )
      }
    />
  )
}

/** Chỉ giữ `File` — upload sau khi tạo tài khoản (lúc đó mới có id). */
export function IdCardPhotoPickerField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  disabled,
  className,
}: {
  control: Control<TFieldValues>
  name: TName
  label: ReactNode
  disabled?: boolean
  className?: string
}) {
  const { field } = useController({ control, name })
  const file = (field.value as File | null | undefined) ?? null
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className={cn(className)}>
      <IdCardPhotoBox
        label={label}
        previewUrl={previewUrl}
        emptyText="Chưa chọn ảnh"
        hasPhoto={Boolean(file)}
        disabled={disabled}
        onPick={(picked) => field.onChange(picked)}
        onClear={() => field.onChange(null)}
      />
    </div>
  )
}
