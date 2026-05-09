import { useRef, useState, type ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadCompanyLandingImage } from '@/features/landing/companyLandingApi'
import { getApiErrorMessage } from '@/lib/axios'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { cn } from '@/lib/utils'

type LandingImageFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  hint?: string
  /** Khung xem trước: ví dụ aspect-video hoặc aspect-square max-w-40 */
  previewClassName?: string
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className="text-foreground">{label}</Label>
      {children}
    </div>
  )
}

/** Xem trước ảnh + nhập đường dẫn + tải file thay thế (lưu dưới `/uploads/company-landing/`). */
export function LandingImageField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  previewClassName,
}: LandingImageFieldProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const raw = typeof field.value === 'string' ? field.value.trim() : ''
        const resolvedRemote = raw ? (resolvePublicAssetUrl(raw) ?? raw) : undefined
        const displaySrc = localPreview ?? resolvedRemote

        return (
          <Block label={label}>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div
                className={cn(
                  'relative w-full max-w-xl shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40',
                  previewClassName ?? 'aspect-video max-h-56'
                )}
              >
                {displaySrc ? (
                  <img
                    key={displaySrc}
                    src={displaySrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => {
                      if (!localPreview) {
                        toast.error(
                          'Không tải được ảnh — kiểm tra đường dẫn và máy chủ có phục vụ /uploads không'
                        )
                      }
                    }}
                  />
                ) : (
                  <div className="flex min-h-[140px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Chưa có ảnh — chọn file hoặc dán đường dẫn
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  dir="ltr"
                  className="font-mono text-sm"
                  placeholder="/Image_VCB/... hoặc /uploads/company-landing/..."
                  value={raw}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    const blobUrl = URL.createObjectURL(file)
                    setLocalPreview(blobUrl)
                    setUploading(true)
                    try {
                      const { url } = await uploadCompanyLandingImage(file)
                      field.onChange(url)
                      toast.success('Đã tải ảnh lên — nhớ bấm Lưu để áp dụng')
                    } catch (err) {
                      toast.error(getApiErrorMessage(err))
                    } finally {
                      setUploading(false)
                      URL.revokeObjectURL(blobUrl)
                      setLocalPreview(null)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" aria-hidden />
                  {uploading ? 'Đang tải…' : 'Chọn ảnh từ máy'}
                </Button>
              </div>
            </div>
          </Block>
        )
      }}
    />
  )
}
