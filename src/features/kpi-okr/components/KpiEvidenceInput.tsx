import { useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { performanceApi } from '@/features/kpi-okr/api'
import {
  validateUploadFile,
  UPLOAD_ACCEPT_IMAGES,
  UPLOAD_MAX_SIZE_BYTES,
} from '@/lib/fileUploadUtils'

function stripTrailingJunk(pathMatch: string): string {
  return pathMatch.replace(/[.,;!?)\]}"'>]+$/g, '')
}

/** Dòng chỉ là đường dẫn ảnh do BE trả sau upload (ẩn khỏi ô nhập, chỉ giữ preview). */
function isKpiEvidenceUploadOnlyLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  return /^\/uploads\/kpi-evidence\/\S+$/.test(t) || /^uploads\/kpi-evidence\/\S+$/.test(t)
}

function partitionEvidenceForDisplay(value: string): { visible: string; uploadLines: string[] } {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const uploadLines: string[] = []
  const visibleLines: string[] = []
  for (const line of lines) {
    if (isKpiEvidenceUploadOnlyLine(line)) {
      uploadLines.push(line.trim())
    } else {
      visibleLines.push(line)
    }
  }
  return {
    visible: visibleLines.join('\n'),
    uploadLines,
  }
}

/** Text evidence hiển thị (bảng/read-only): ẩn dòng chỉ là đường dẫn upload `/uploads/kpi-evidence/...` — preview ảnh vẫn lấy từ trường đầy đủ. */
export function evidenceTextWithoutUploadPaths(evidence: string | null | undefined): string {
  if (!evidence?.trim()) return ''
  const { visible } = partitionEvidenceForDisplay(evidence)
  return visible.replace(/\s*$/, '')
}

function mergeVisibleWithUploadLines(visible: string, uploadLines: string[]): string {
  const v = visible.replace(/\r\n/g, '\n').replace(/\s*$/, '')
  const paths = uploadLines.filter(Boolean)
  if (!paths.length) return v
  return v ? `${v}\n${paths.join('\n')}` : paths.join('\n')
}

function normalizePreviewUrl(u: string): string {
  return u.trim()
}

/**
 * Gỡ một ảnh khỏi nội dung evidence (đối chiếu theo URL preview như trong `evidenceImageUrlsFromText`).
 */
export function removeEvidenceImageByPreviewUrl(evidence: string, previewSrc: string): string {
  const target = normalizePreviewUrl(previewSrc)
  if (!target) return evidence

  const lines = evidence.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []

  for (const line of lines) {
    if (isKpiEvidenceUploadOnlyLine(line)) {
      const r = resolvePublicAssetUrl(line.trim())
      if (r && normalizePreviewUrl(r) === target) continue
      out.push(line)
      continue
    }

    const t = line.trim()
    if (/^https?:\/\//i.test(t) && /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(t)) {
      if (normalizePreviewUrl(t) === target) continue
      out.push(line)
      continue
    }

    let edited = line
    let changed = false

    for (const m of line.matchAll(/\/uploads\/kpi-evidence\/\S+/gi)) {
      const r = resolvePublicAssetUrl(stripTrailingJunk(m[0]))
      if (r && normalizePreviewUrl(r) === target) {
        edited = edited.replace(m[0], '')
        changed = true
      }
    }
    for (const m of line.matchAll(/(?:^|[\s"'“(])uploads\/kpi-evidence\/\S+/gi)) {
      const raw = stripTrailingJunk(m[0].replace(/^[\s"'“(]+/, '').trim())
      const abs = raw.startsWith('uploads/') ? `/${raw}` : raw
      if (!abs.startsWith('/uploads/kpi-evidence/')) continue
      const r = resolvePublicAssetUrl(abs)
      if (r && normalizePreviewUrl(r) === target) {
        edited = edited.replace(m[0], '')
        changed = true
      }
    }

    if (changed) {
      edited = edited.replace(/\s{2,}/g, ' ').trim()
      if (edited) out.push(edited)
      continue
    }

    out.push(line)
  }

  return out.join('\n')
}

/** Dòng / đoạn văn bản có thể chứa URL ảnh (http(s) hoặc `/uploads/...`) để preview. */
export function resolveEvidenceAssetUrl(line: string): string | null {
  const t = line.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) {
    if (/\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(t)) return t
    return null
  }
  // Ảnh minh chứng KPI — BE chỉ lưu thư mục này; không bắt buộc đuôi (multer luôn có ext).
  const kpi = t.match(/\/uploads\/kpi-evidence\/\S+/)
  if (kpi) {
    return resolvePublicAssetUrl(stripTrailingJunk(kpi[0])) ?? null
  }
  const kpiRel = t.match(/(?:^|\s)uploads\/kpi-evidence\/\S+/)
  if (kpiRel) {
    const raw = stripTrailingJunk(kpiRel[0].trim())
    const abs = raw.startsWith('uploads/') ? `/${raw}` : raw
    if (abs.startsWith('/uploads/kpi-evidence/')) {
      return resolvePublicAssetUrl(abs) ?? null
    }
  }
  if (t.startsWith('/uploads/') && /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(t)) {
    return resolvePublicAssetUrl(t) ?? null
  }
  return null
}

export function evidenceImageUrlsFromText(evidence: string | null | undefined): string[] {
  if (!evidence?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  const add = (url: string | undefined | null) => {
    if (!url?.trim() || seen.has(url)) return
    seen.add(url)
    out.push(url)
  }

  for (const m of evidence.matchAll(/\/uploads\/kpi-evidence\/\S+/gi)) {
    add(resolvePublicAssetUrl(stripTrailingJunk(m[0])))
  }
  for (const m of evidence.matchAll(/(?:^|[\s"'“(])uploads\/kpi-evidence\/\S+/gi)) {
    const raw = stripTrailingJunk(m[0].replace(/^[\s"'“(]+/, '').trim())
    const abs = raw.startsWith('uploads/') ? `/${raw}` : raw
    if (abs.startsWith('/uploads/kpi-evidence/')) add(resolvePublicAssetUrl(abs))
  }

  for (const line of evidence.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    if (/^https?:\/\//i.test(t) && /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(t)) {
      add(t)
      continue
    }
    const u = resolveEvidenceAssetUrl(t)
    if (u) add(u)
  }

  return out
}

export function EvidenceImagePreviews({
  evidence,
  maxHeightClass = 'h-14 max-w-[100px]',
}: {
  evidence: string | null | undefined
  maxHeightClass?: string
}) {
  const urls = useMemo(() => evidenceImageUrlsFromText(evidence), [evidence])
  if (urls.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {urls.map((src) => (
        <a key={src} href={src} target="_blank" rel="noreferrer" className="block shrink-0">
          <img
            src={src}
            alt=""
            className={cn(
              'rounded border border-slate-200 object-cover dark:border-slate-700',
              maxHeightClass
            )}
          />
        </a>
      ))}
    </div>
  )
}

/** Evidence: textarea + dán link + upload ảnh (URL `/uploads/kpi-evidence/` được ghép vào nội dung). */
export function KpiEvidenceInput({
  value,
  onChange,
  textareaClassName,
  disabled,
  compact,
}: {
  value: string
  onChange: (next: string) => void
  textareaClassName?: string
  disabled?: boolean
  /** Bảng KPI: ẩn hint dài, thu gọn nút/textarea. */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const previewUrls = useMemo(() => evidenceImageUrlsFromText(value), [value])
  const { visible, uploadLines } = useMemo(() => partitionEvidenceForDisplay(value), [value])

  const appendLine = (line: string) => {
    const next = value.trim() ? `${value.replace(/\s*$/, '')}\n${line}` : line
    onChange(next)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    const validationError = validateUploadFile(file, {
      maxSizeBytes: UPLOAD_MAX_SIZE_BYTES,
      accept: UPLOAD_ACCEPT_IMAGES,
    })
    if (validationError) {
      toast.error(validationError)
      return
    }
    setUploading(true)
    try {
      const { url } = await performanceApi.uploadKpiEvidenceImage(file)
      appendLine(url)
      toast.success('Đã tải ảnh minh chứng.')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('min-w-0 max-w-full', compact ? 'space-y-1.5' : 'space-y-2')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'gap-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300',
            compact ? 'h-8 px-2' : 'h-9 gap-1.5 rounded-xl px-3'
          )}
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className={cn('text-slate-500', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          {uploading ? 'Đang tải…' : 'Tải ảnh'}
        </Button>
        {!compact ? (
          <span className="text-xs text-muted-foreground">
            Hoặc dán link trong ô dưới · JPEG/PNG/WebP/GIF · tối đa 8MB
          </span>
        ) : null}
      </div>
      <Textarea
        value={visible}
        onChange={(e) => onChange(mergeVisibleWithUploadLines(e.target.value, uploadLines))}
        rows={compact ? 2 : 3}
        disabled={disabled}
        placeholder="Link minh chứng, đường dẫn ảnh, hoặc mô tả…"
        className={cn(
          'min-h-[72px] resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500',
          textareaClassName
        )}
      />
      {previewUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/30">
          {previewUrls.map((src, i) => (
            <div key={`${src}#${i}`} className="relative shrink-0 group">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg shadow-sm transition-all hover:shadow-md"
              >
                <img
                  src={src}
                  alt=""
                  className="h-16 max-w-[120px] rounded-lg border border-slate-200 object-cover transition-transform duration-200 group-hover:scale-105 dark:border-slate-700"
                />
              </a>
              {!disabled ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-1.5 -top-1.5 z-10 h-6 w-6 rounded-full p-0 shadow-md transition-transform hover:scale-110"
                  title="Gỡ ảnh khỏi minh chứng"
                  aria-label="Gỡ ảnh khỏi minh chứng"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(removeEvidenceImageByPreviewUrl(value, src))
                    toast.success('Đã gỡ ảnh.')
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
