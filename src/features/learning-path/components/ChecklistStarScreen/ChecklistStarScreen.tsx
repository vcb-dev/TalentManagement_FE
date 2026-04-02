import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLearningChecklist, useStarSubmissions, useSubmitEvidence } from '@/features/learning-path/hooks'
import { useChecklistItem } from '@/features/learning-path/components/ChecklistItem/useChecklistItem'
import { Skeleton, SkeletonApprovalCardRow } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, PROGRESS_BAR_FILL, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

const LEVEL_VI: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp kết quả',
  tuong: 'Tướng',
}

/** Phụ đề theo thứ tự nhiệm vụ (mock 05_NV_Checklist). */
const ROW_SUB: Record<number, { done?: string; current?: string; locked?: string }> = {
  1: { done: 'Hoàn thành 15/03/2026 · Người chấm đã duyệt' },
  2: { done: 'Đạt 8.5/10 · 18/03/2026' },
  3: { current: 'Nhiệm vụ hiện tại · Upload file kết quả' },
  4: { locked: '🔒 Hoàn thành nhiệm vụ trước mới mở' },
  5: { locked: '🔒 Chưa mở' },
}

function rowKind(
  items: { id: string; order: number }[],
  itemId: string,
  checklist: ReturnType<typeof useChecklistItem>
): 'done' | 'current' | 'locked' {
  if (!checklist.isUnlocked(itemId)) return 'locked'
  if (checklist.isCompleted(itemId)) return 'done'
  const next = items.find((i) => checklist.isUnlocked(i.id) && !checklist.isCompleted(i.id))
  return next?.id === itemId ? 'current' : 'locked'
}

export interface ChecklistStarScreenProps {
  levelId: string
  starId: string
}

export function ChecklistStarScreen({ levelId, starId }: ChecklistStarScreenProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useLearningChecklist(levelId, starId)
  const sortedItems = useMemo(() => {
    const arr = [...(data?.items ?? [])]
    return arr.sort((a, b) => a.order - b.order)
  }, [data?.items])
  const completed = data?.completedIds ?? []
  const checklist = useChecklistItem(sortedItems, completed)
  const { data: submissions } = useStarSubmissions(starId)
  const submit = useSubmitEvidence()
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')

  const levelName = LEVEL_VI[levelId] ?? levelId
  const total = sortedItems.length
  const doneCount = sortedItems.filter((i) => checklist.isCompleted(i.id)).length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const currentItem = sortedItems.find((i) => checklist.isUnlocked(i.id) && !checklist.isCompleted(i.id))

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentItem) return
    submit.mutate(
      { levelId, starId, itemId: currentItem.id, file },
      {
        onSuccess: () => {
          setNote('')
          e.target.value = ''
        },
      }
    )
  }

  return (
    <div className="-m-5 flex min-h-[calc(100vh-3rem)] flex-col bg-app-canvas text-base text-foreground md:-m-6 lg:-m-8">
      <div className="page-toolbar-gradient">
        <div className="pointer-events-none absolute inset-0 opacity-30 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: 'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 90%)', backgroundSize: '200% 100%' }} />
        <div className="relative flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-primary/25 bg-card/95 px-3.5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur-sm transition-all motion-safe:hover:border-primary/40 motion-safe:hover:bg-primary/10 motion-safe:hover:shadow-md md:text-base"
            onClick={() =>
              void navigate({
                to: '/learning-path',
                search: {
                  levelId: levelId as 'tap_su' | 'biet_viec' | 'duoc_viec' | 'dong_gop_ket_qua' | 'tuong',
                  starId: Number(starId) || 1,
                },
              })
            }
          >
            ← Học tập
          </button>
          <span className="text-sm text-muted-foreground md:text-base">
            {levelName} /{' '}
            <b className="bg-gradient-to-r from-primary to-violet-700 bg-clip-text text-transparent">Sao {starId}</b>
          </span>
        </div>
        <span className="relative rounded-full border border-teal-500/30 bg-gradient-to-r from-teal-500/15 to-primary/12 px-3 py-1 text-sm font-bold text-teal-900 shadow-sm ring-1 ring-teal-500/15 dark:text-teal-100">
          Đang học
        </span>
      </div>

      <div className="page-shell">
        {isLoading ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,320px)]">
            <div className="space-y-4">
              <div>
                <Skeleton className="mb-2 h-5 w-48 rounded-md" />
                <Skeleton className="mb-1.5 h-2 w-full max-w-md rounded-full" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonApprovalCardRow key={i} />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <Skeleton className="mb-3 h-10 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,320px)]">
            <div>
              <div className="mb-4">
                <div className="mb-1.5 text-base font-semibold text-foreground md:text-lg">
                  Sao {starId} — {levelName}
                </div>
                <div className="group/pb mb-1.5 h-2 overflow-hidden rounded-full bg-primary/15 transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r from-primary via-sky-600 to-accent',
                      PROGRESS_BAR_FILL
                    )}
                    style={{ width: `${pct}%`, transformOrigin: '0 50%', animationDelay: '80ms' }}
                  />
                </div>
                <div className="text-sm text-muted-foreground md:text-base">
                  {doneCount}/{total} nhiệm vụ hoàn thành
                </div>
              </div>

              <div className="space-y-2">
                {sortedItems.map((it) => {
                  const kind = rowKind(sortedItems, it.id, checklist)
                  const sub = ROW_SUB[it.order]
                  return (
                    <ChecklistRow
                      key={it.id}
                      title={it.title}
                      kind={kind}
                      subtitle={
                        kind === 'done'
                          ? sub?.done
                          : kind === 'current'
                            ? sub?.current
                            : sub?.locked ?? '🔒 Chưa mở'
                      }
                      primaryAction={
                        kind === 'done'
                          ? it.order === 2
                            ? { label: 'Xem kết quả', onClick: () => {} }
                            : { label: 'Xem bằng chứng', onClick: () => {} }
                          : kind === 'current'
                            ? { label: 'Nộp bằng chứng', onClick: onPickFile }
                            : undefined
                      }
                    />
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div
                className={cn(
                  'overflow-hidden rounded-xl border border-teal-200/60 bg-card shadow-[var(--shadow-card)] ring-1 ring-teal-100/40',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(0)}
              >
                <div className="border-b border-teal-100 bg-gradient-to-r from-teal-500/12 via-primary/8 to-transparent px-4 py-3.5 text-sm font-semibold text-teal-950 md:text-base">
                  Nộp bằng chứng
                </div>
                <div className="p-4">
                  <div className="mb-3 rounded-[9px] border-2 border-dashed border-primary/35 bg-gradient-to-br from-primary/[0.07] via-teal-50/80 to-cyan-50/50 px-4 py-6 text-center transition-colors motion-safe:hover:border-primary/50">
                    <div className="mb-2 text-[32px] opacity-35">📁</div>
                    <div className="text-sm font-medium text-foreground/90 md:text-base">Kéo thả file vào đây</div>
                    <div className="mt-1 text-xs text-muted-foreground md:text-sm">PDF, DOCX, PNG, MP4 · Tối đa 50MB</div>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                      onChange={onFileChange}
                    />
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-button bg-button px-4 py-2 text-sm font-medium text-button-foreground hover:opacity-90 disabled:opacity-50"
                      onClick={onPickFile}
                      disabled={!currentItem || submit.isPending}
                    >
                      Chọn file
                    </button>
                  </div>
                  <div className="mb-3 flex flex-col gap-1">
                    <label className="text-sm font-semibold text-foreground/85 md:text-base" htmlFor="evidence-note">
                      Mô tả bằng chứng
                    </label>
                    <textarea
                      id="evidence-note"
                      className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 md:text-base"
                      placeholder="Mô tả ngắn về bằng chứng..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-button bg-button py-2.5 text-sm font-medium text-button-foreground hover:opacity-90 disabled:opacity-50 md:text-base"
                    disabled={!currentItem || submit.isPending}
                    onClick={onPickFile}
                  >
                    {submit.isPending ? 'Đang gửi…' : 'Nộp bài'}
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden rounded-xl border border-indigo-200/55 bg-card shadow-[var(--shadow-card)] ring-1 ring-indigo-100/40',
                  CARD_ENTRANCE_HOVER
                )}
                style={staggerStyle(1)}
              >
                <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-500/12 via-violet-500/8 to-transparent px-4 py-3.5 text-sm font-semibold text-indigo-950 md:text-base">
                  Bài đã nộp gần nhất
                </div>
                <div className="divide-y divide-border p-4 text-sm md:text-base">
                  {(submissions ?? []).slice(0, 5).map((s) => (
                    <div key={s.id} className="py-2 first:pt-0 last:pb-0">
                      <div className="font-semibold text-foreground">{s.fileName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                        <span className="font-medium text-primary">
                          {s.status === 'ACCEPTED' ? 'Đã duyệt' : s.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!submissions || submissions.length === 0) && (
                    <div className="text-muted-foreground">Chưa có bài nộp.</div>
                  )}
                </div>
              </div>

              <Link
                to="/dashboard"
                className="text-center text-sm font-semibold text-primary hover:underline md:text-base"
              >
                ← Về Dashboard học tập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChecklistRow({
  title,
  kind,
  subtitle,
  primaryAction,
}: {
  title: string
  kind: 'done' | 'current' | 'locked'
  subtitle?: string
  primaryAction?: { label: string; onClick: () => void }
}) {
  const wrap = cn(
    'flex items-start gap-3 rounded-[9px] border p-3.5 motion-safe:transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md md:p-4',
    kind === 'done' && 'border-emerald-200/80 bg-emerald-50/85',
    kind === 'current' &&
      'border-primary/35 bg-gradient-to-r from-primary/12 via-sky-500/10 to-violet-500/8 shadow-[0_2px_12px_hsl(var(--primary)/0.12)]',
    kind === 'locked' && 'pointer-events-none border-slate-200/60 bg-slate-50/80 opacity-45'
  )

  const chk = cn(
    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] text-[10px] font-bold md:h-[22px] md:w-[22px] md:text-xs',
    kind === 'done' && 'border-button bg-button text-button-foreground shadow-sm',
    kind === 'current' && 'border-primary bg-card text-primary shadow-sm ring-2 ring-primary/20',
    kind === 'locked' && 'border-border bg-muted/50'
  )

  return (
    <div className={wrap}>
      <div className={chk}>{kind === 'done' ? '✓' : kind === 'current' ? '→' : ''}</div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-sm font-semibold leading-snug md:text-base',
            kind === 'current' ? 'text-primary' : kind === 'done' ? 'text-emerald-900' : 'text-foreground'
          )}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            className={cn(
              'mt-1.5 text-xs leading-snug md:text-sm',
              kind === 'current' ? 'text-primary/80' : kind === 'done' ? 'text-emerald-800/90' : 'text-muted-foreground'
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {primaryAction ? (
        <button
          type="button"
          className={cn(
            'shrink-0 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-sm font-medium motion-safe:transition-colors md:text-base',
            kind === 'done' &&
              'border border-teal-300/70 bg-teal-50 text-teal-900 hover:bg-teal-100/90 dark:border-teal-600/50 dark:bg-teal-950/40 dark:text-teal-100',
            kind === 'current' && 'border border-button bg-button text-button-foreground hover:opacity-90'
          )}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </button>
      ) : null}
    </div>
  )
}
