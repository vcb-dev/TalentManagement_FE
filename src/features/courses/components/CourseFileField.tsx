import { useRef } from 'react'
import { FileUp, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { validateUploadFile } from '@/lib/fileUploadUtils'
import { cn } from '@/lib/utils'

/** Khớp giới hạn `FileInterceptor` ở BE `POST /admin/courses/upload`. */
const COURSE_FILE_MAX_BYTES = 50 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Ô chọn file thay cho `<input type="file">` gốc (chữ "Chọn tệp / Không có tệp nào được chọn"
 * của trình duyệt dễ bị nhầm là ô nhập). File chỉ được tải lên khi bấm lưu.
 */
export function CourseFileField({
  id,
  file,
  existingFileName,
  disabled,
  onPick,
  onClear,
}: {
  id: string
  /** File mới chọn, chưa tải lên. */
  file: File | null
  /** File đang đính kèm của tài liệu (khi sửa); `undefined` = không có. */
  existingFileName?: string | null
  disabled?: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasExisting = existingFileName !== undefined
  const hasFile = Boolean(file) || hasExisting

  const name = file ? file.name : hasExisting ? existingFileName || 'File đã đính kèm' : null
  const hint = file
    ? `${formatFileSize(file.size)} · sẽ tải lên khi lưu`
    : hasExisting
      ? 'File hiện tại — chọn file khác để thay'
      : 'PDF, Word, Excel, ảnh… tối đa 50MB'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
        hasFile ? 'border-border/80 bg-card' : 'border-dashed border-border bg-muted/20'
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          hasFile ? 'bg-button/10 text-button' : 'bg-muted text-muted-foreground'
        )}
      >
        <Paperclip className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'line-clamp-2 break-words text-sm',
            name ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
          title={name ?? undefined}
        >
          {name ?? 'Chưa chọn file'}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.files?.[0]
          // Cho phép chọn lại đúng file vừa bỏ.
          e.target.value = ''
          if (!picked) return
          const error = validateUploadFile(picked, { maxSizeBytes: COURSE_FILE_MAX_BYTES })
          if (error) {
            toast.error(error)
            return
          }
          onPick(picked)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 px-3 sm:px-4"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="size-4" aria-hidden />
        {/* Đã có file: màn hẹp chỉ hiện icon để nhường chỗ cho tên file. */}
        <span className={hasFile ? 'sr-only sm:not-sr-only' : undefined}>
          {hasFile ? 'Đổi file' : 'Chọn file'}
        </span>
      </Button>
      {hasFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-lg"
          disabled={disabled}
          aria-label={file ? 'Bỏ file vừa chọn' : 'Bỏ file đính kèm'}
          onClick={onClear}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
