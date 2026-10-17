import { Button } from '@/components/ui/button'
import {
  useAnyActionPending,
  useAttachmentSignedUrl,
  useUploadAttachment,
} from '@/features/hr-admin/hooks'
import { useMeAttachmentSignedUrl, useUploadMeAttachment } from '@/features/profile/hooks'
import { getApiErrorMessage } from '@/lib/axios'
import { validateUploadFile } from '@/lib/fileUploadUtils'
import { cn } from '@/lib/utils'
import { Eye, FileText, FileUp, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { toast } from 'sonner'

/** Khớp `CV_TYPES` ở BE. */
const CV_ACCEPT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]
/** Trình duyệt đôi khi không nhận ra MIME của file Word — xét thêm đuôi tên file. */
const CV_ACCEPT_EXTENSIONS = ['.pdf', '.doc', '.docx']
const CV_INPUT_ACCEPT = [...CV_ACCEPT_EXTENSIONS, ...CV_ACCEPT_TYPES].join(',')
/** Khớp `PRIVATE_DOC_MAX_BYTES` ở BE. */
const CV_MAX_BYTES = 10 * 1024 * 1024

export function validateCvFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const ext = /\.[a-z0-9]+$/i.exec(file.name)?.[0]?.toLowerCase() ?? ''
  const unknownType = file.type === '' || file.type === 'application/octet-stream'
  const typeOk =
    CV_ACCEPT_TYPES.includes(file.type) || (unknownType && CV_ACCEPT_EXTENSIONS.includes(ext))
  if (!typeOk) return 'CV chỉ nhận PDF, Word (.doc, .docx) hoặc ảnh JPG/PNG/WebP'
  return validateUploadFile(file as File, { maxSizeBytes: CV_MAX_BYTES })
}

/** "cv/<id>/1784000431545.pdf" → "PDF" — object path không giữ tên file gốc. */
function storedCvKind(objectPath: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(objectPath)?.[1]
  return ext ? ext.toUpperCase() : 'tài liệu'
}

function CvBox({
  label,
  statusText,
  hasFile,
  busy,
  viewing,
  disabled,
  onPick,
  onView,
  onClear,
}: {
  label: ReactNode
  statusText: string
  hasFile: boolean
  busy?: boolean
  viewing?: boolean
  disabled?: boolean
  onPick: (file: File) => void
  onView?: () => void
  onClear?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      {label}
      <div className="flex min-h-10 items-center gap-2 text-sm">
        {busy ? (
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span
          className={cn('min-w-0 truncate', hasFile ? 'font-semibold' : 'text-muted-foreground')}
          title={statusText}
        >
          {busy ? 'Đang tải CV lên…' : statusText}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={CV_INPUT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          const error = validateCvFile(file)
          if (error) {
            toast.error(error)
            return
          }
          onPick(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        {onView && hasFile ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={busy || viewing}
            onClick={onView}
          >
            {viewing ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
            Xem CV
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-4 w-4" aria-hidden />
          {hasFile ? 'Thay CV' : 'Tải CV lên'}
        </Button>
        {onClear && hasFile ? (
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

function openSignedUrl(signedUrl: string | null) {
  if (!signedUrl) {
    toast.error('Không tìm thấy tài liệu')
    return
  }
  window.open(signedUrl, '_blank', 'noopener,noreferrer')
}

/** Chọn file là tải lên ngay, không chờ "Lưu thay đổi". */
export function CvUploadField({
  employeeId,
  label,
  objectPath: initialObjectPath,
  canEdit,
}: {
  employeeId: string
  label: ReactNode
  objectPath: string | null
  canEdit: boolean
}) {
  const [objectPath, setObjectPath] = useState(initialObjectPath)
  useEffect(() => setObjectPath(initialObjectPath), [initialObjectPath])

  const upload = useUploadAttachment()
  const view = useAttachmentSignedUrl()
  const anyActionPending = useAnyActionPending()

  return (
    <CvBox
      label={label}
      statusText={objectPath ? `Đã có CV (${storedCvKind(objectPath)})` : 'Chưa có CV'}
      hasFile={Boolean(objectPath)}
      busy={upload.isPending}
      viewing={view.isPending}
      disabled={!canEdit || anyActionPending}
      onView={() =>
        view.mutate(
          { id: employeeId, field: 'cvAttachmentRef' },
          { onSuccess: (data) => openSignedUrl(data.signedUrl) }
        )
      }
      onPick={(file) =>
        upload.mutate(
          { id: employeeId, field: 'cvAttachmentRef', file },
          {
            onSuccess: (data) => {
              setObjectPath(data.objectPath)
              toast.success('Đã lưu CV')
            },
            onError: (err) => toast.error(getApiErrorMessage(err) || 'Không tải được CV'),
          }
        )
      }
    />
  )
}

export function MyCvUploadField({
  label,
  objectPath: initialObjectPath,
}: {
  label: ReactNode
  objectPath: string | null
}) {
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const objectPath = uploadedPath ?? initialObjectPath

  const upload = useUploadMeAttachment()
  const view = useMeAttachmentSignedUrl()
  const anyActionPending = useAnyActionPending()

  return (
    <CvBox
      label={label}
      statusText={objectPath ? `Đã có CV (${storedCvKind(objectPath)})` : 'Chưa có CV'}
      hasFile={Boolean(objectPath)}
      busy={upload.isPending}
      viewing={view.isPending}
      disabled={anyActionPending}
      onView={() =>
        view.mutate('cvAttachmentRef', {
          onSuccess: (data) => openSignedUrl(data.signedUrl),
          onError: (err) => toast.error(getApiErrorMessage(err) || 'Không thể mở tài liệu'),
        })
      }
      onPick={(file) =>
        upload.mutate(
          { field: 'cvAttachmentRef', file },
          {
            onSuccess: (data) => {
              setUploadedPath(data.objectPath)
              toast.success('Đã lưu CV')
            },
            onError: (err) => toast.error(getApiErrorMessage(err) || 'Không tải được CV'),
          }
        )
      }
    />
  )
}

/** Chỉ giữ `File` — upload sau khi tạo tài khoản (lúc đó mới có id). */
export function CvPickerField<
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

  return (
    <div className={cn(className)}>
      <CvBox
        label={label}
        statusText={file ? file.name : 'Chưa chọn file'}
        hasFile={Boolean(file)}
        disabled={disabled}
        onPick={(picked) => field.onChange(picked)}
        onClear={() => field.onChange(null)}
      />
    </div>
  )
}
