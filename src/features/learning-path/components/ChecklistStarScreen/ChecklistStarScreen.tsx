import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Clock, Lock, Paperclip, Trophy } from 'lucide-react'
import { useLearningChecklist, useStarSubmissions, useSubmitEvidence } from '@/features/learning-path/hooks'
import { useChecklistItem } from '@/features/learning-path/components/ChecklistItem/useChecklistItem'
import { Skeleton, SkeletonApprovalCardRow } from '@/components/ui/skeleton'
import { CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
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
  1: { done: 'Hoàn thành 15/03/2026 · Người chấm đã duyệt', current: 'Tìm hiểu chi tiết các bước vận hành theo quy định nội bộ.' },
  2: { done: 'Đạt 8.5/10 · 18/03/2026' },
  3: { current: 'Nhiệm vụ hiện tại · Upload file kết quả' },
  4: { locked: 'Hoàn thành nhiệm vụ trước để mở' },
  5: { locked: 'Chưa mở' },
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

function BannerStars({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('text-base leading-none', i < filled ? 'text-white' : 'text-white/35')}>
          ★
        </span>
      ))}
    </div>
  )
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
        <div
          className="pointer-events-none absolute inset-0 opacity-30 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background: 'linear-gradient(110deg, transparent 0%, rgb(79 70 229 / 0.08) 50%, transparent 90%)',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="relative flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap rounded-[10px] border border-primary-600/20 bg-white px-3.5 py-2 text-sm font-semibold text-primary-600 shadow-sm transition-colors hover:bg-primary-50 md:text-base"
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
        </div>
        <span className="relative rounded-full border border-primary-600/15 bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
          Đang học
        </span>
      </div>

      <div className="page-shell">
        {isLoading ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,340px)]">
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
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex flex-wrap items-center gap-1 text-[13px]">
              <span className="font-medium uppercase tracking-wide text-gray-500">{levelName}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="font-semibold uppercase tracking-wide text-gray-900">Sao {starId}</span>
            </div>

            <div className="vcb-banner-gradient mb-6 flex flex-col gap-5 rounded-2xl px-6 py-6 text-white shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide">
                    LEVEL 1
                  </span>
                  <BannerStars filled={Math.min(doneCount, 5)} total={5} />
                </div>
                <h1 className="text-[22px] font-bold leading-tight tracking-tight">
                  Sao {starId} — {levelName}
                </h1>
                <p className="max-w-xl text-sm text-white/75">
                  Bắt đầu hành trình chinh phục kỹ năng chuyên môn tại VCB.
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-white/15 px-5 py-4 text-center sm:text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Tiến độ</div>
                <div className="text-[36px] font-bold leading-none tabular-nums">
                  {doneCount}/{total || 5}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(280px,340px)]">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">Danh sách nhiệm vụ</h2>
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-[12px] font-semibold text-primary-700">
                    Đang thực hiện
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedItems.map((it) => {
                    const kind = rowKind(sortedItems, it.id, checklist)
                    const sub = ROW_SUB[it.order]
                    return (
                      <ChecklistRow
                        key={it.id}
                        title={it.title}
                        kind={kind}
                        showMentor={kind === 'current' && it.order === 1}
                        subtitle={
                          kind === 'done'
                            ? sub?.done
                            : kind === 'current'
                              ? sub?.current
                              : sub?.locked ?? 'Hoàn thành nhiệm vụ trước để mở'
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

              <div className="flex flex-col gap-4">
                <div
                  className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[var(--shadow-card)]', CARD_ENTRANCE_HOVER)}
                  style={staggerStyle(0)}
                >
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                    <Paperclip className="h-5 w-5 shrink-0 text-primary-600" strokeWidth={2} />
                    <h3 className="text-lg font-semibold text-gray-900">Nộp bằng chứng</h3>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-8 text-center transition-colors hover:border-primary-600/40">
                      <div className="mb-2 text-[32px] opacity-50">📁</div>
                      <div className="text-sm font-semibold text-gray-900">Tải tệp lên</div>
                      <div className="mt-1 text-[13px] text-gray-500">Hoặc nhấn để chọn tệp từ máy</div>
                      <div className="mt-1 text-xs text-gray-400">Tối đa 25MB</div>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                        onChange={onFileChange}
                      />
                      <button
                        type="button"
                        className="mt-4 rounded-[10px] bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                        onClick={onPickFile}
                        disabled={!currentItem || submit.isPending}
                      >
                        Chọn file
                      </button>
                    </div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500" htmlFor="evidence-note">
                      Mô tả
                    </label>
                    <textarea
                      id="evidence-note"
                      className="mb-4 min-h-[120px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20"
                      placeholder="Mô tả ngắn về bằng chứng nộp kèm…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button
                      type="button"
                      className="h-11 w-full rounded-[10px] bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      disabled={!currentItem || submit.isPending}
                      onClick={onPickFile}
                    >
                      {submit.isPending ? 'Đang gửi…' : 'Nộp bài'}
                    </button>
                  </div>
                </div>

                <div
                  className={cn('overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-[var(--shadow-card)]', CARD_ENTRANCE_HOVER)}
                  style={staggerStyle(1)}
                >
                  <div className="border-b border-gray-200 px-5 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Bài đã nộp gần nhất</span>
                  </div>
                  <div className="p-5">
                    {(submissions ?? []).length > 0 ? (
                      <ul className="divide-y divide-gray-200 text-sm">
                        {(submissions ?? []).slice(0, 5).map((s) => (
                          <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="font-semibold text-gray-900">{s.fileName}</div>
                            <div className="mt-0.5 text-[13px] text-gray-500">
                              {new Date(s.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                              <span className="font-medium text-primary-600">
                                {s.status === 'ACCEPTED' ? 'Đã duyệt' : s.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center py-2 text-center">
                        <Clock className="mb-2 h-8 w-8 text-gray-300" strokeWidth={1.5} />
                        <p className="text-sm font-semibold text-gray-900">Chưa có bài nộp</p>
                        <p className="mt-1 max-w-[240px] text-[13px] text-gray-500">Các bài nộp sẽ xuất hiện tại đây sau khi bạn gửi.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-reward-bg p-5 shadow-[var(--shadow-card)]">
                  <span className="inline-block rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning">
                    Reward preview
                  </span>
                  <h4 className="mt-3 text-lg font-bold text-gray-900">Huy hiệu Sao {starId}</h4>
                  <p className="mt-2 max-w-[14rem] text-sm text-gray-700">
                    Hoàn thành {total || 5} nhiệm vụ để nhận huy hiệu Bronze Elite và +500 XP.
                  </p>
                  <Trophy className="pointer-events-none absolute -bottom-1 right-2 h-20 w-20 text-warning/25" strokeWidth={1.25} aria-hidden />
                </div>

                <Link
                  to="/dashboard"
                  className="block text-center text-sm font-semibold text-primary-600 hover:underline"
                >
                  ← Về Dashboard học tập
                </Link>
              </div>
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
  showMentor,
}: {
  title: string
  kind: 'done' | 'current' | 'locked'
  subtitle?: string
  primaryAction?: { label: string; onClick: () => void }
  showMentor?: boolean
}) {
  const wrap = cn(
    'flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between',
    kind === 'done' && 'bg-success-muted/30',
    kind === 'current' && 'border-l-[3px] border-primary-600 bg-primary-50/60',
    kind === 'locked' && 'cursor-not-allowed bg-gray-50/90 text-gray-400'
  )

  return (
    <div className={wrap}>
      <div className="flex min-w-0 flex-1 gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] text-[10px] font-bold',
            kind === 'done' && 'border-primary-600 bg-primary-600 text-white',
            kind === 'current' && 'border-primary-600 bg-white text-primary-600',
            kind === 'locked' && 'border-gray-200 bg-gray-100'
          )}
        >
          {kind === 'done' ? '✓' : ''}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-base font-semibold leading-snug',
                kind === 'current' ? 'text-gray-900' : kind === 'done' ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {title}
            </span>
            {kind === 'current' ? (
              <span className="rounded-full bg-active-tag-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-active-tag-text">
                Active
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p
              className={cn(
                'mt-1.5 text-sm leading-snug',
                kind === 'current' ? 'text-gray-600' : kind === 'done' ? 'text-gray-600' : 'text-gray-400'
              )}
            >
              {subtitle}
            </p>
          ) : null}
          {showMentor ? (
            <p className="mt-2 text-[13px] text-gray-500">Hướng dẫn bởi Ms. Linh</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        {primaryAction ? (
          <button
            type="button"
            className={cn(
              'whitespace-nowrap rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors',
              kind === 'done' && 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
              kind === 'current' && 'bg-primary-600 text-white hover:bg-primary-700'
            )}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </button>
        ) : null}
        {kind === 'locked' ? <Lock className="h-5 w-5 shrink-0 text-gray-300" strokeWidth={2} aria-hidden /> : null}
      </div>
    </div>
  )
}
