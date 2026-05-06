import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/axios'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { performanceApi } from '@/features/kpi-okr/api'

function stripTrailingJunk(pathMatch: string): string {
  return pathMatch.replace(/[.,;!?)\]}"'>]+$/g, '')
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
}: {
  value: string
  onChange: (next: string) => void
  textareaClassName?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const previewUrls = useMemo(() => evidenceImageUrlsFromText(value), [value])

  const appendLine = (line: string) => {
    onChange(value.trim() ? `${value.replace(/\s*$/, '')}\n${line}` : line)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    setUploading(true)
    try {
      const { url } = await performanceApi.uploadKpiEvidenceImage(file)
      appendLine(url)
      toast.success('Đã tải ảnh — đường dẫn đã thêm vào Evidence.')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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
          className="h-8 gap-1.5 text-xs"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Đang tải…' : 'Tải ảnh'}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Hoặc dán link trong ô dưới (JPEG/PNG/WebP/GIF, tối đa 8MB)
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="Link minh chứng, đường dẫn ảnh, hoặc mô tả…"
        className={cn(
          'min-h-[72px] resize-y rounded-md border border-slate-200 bg-white p-2 text-[12px] dark:border-slate-700 dark:bg-slate-950',
          textareaClassName
        )}
      />
      {previewUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/30">
          {previewUrls.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="block shrink-0">
              <img
                src={src}
                alt=""
                className="h-16 max-w-[120px] rounded border border-slate-200 object-cover dark:border-slate-700"
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
