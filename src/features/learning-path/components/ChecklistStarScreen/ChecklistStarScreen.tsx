import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CloudUpload,
  ListChecks,
  Lock,
  Paperclip,
  Trophy,
} from 'lucide-react'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  useLearningChecklist,
  useMyLearningPath,
  useStarSubmissions,
  useSubmitEvidence,
} from '@/features/learning-path/hooks'
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
  /** Gắn trong `/learning-path` (member): bỏ nút về hub, không full-bleed âm lề. */
  embedInLearningPath?: boolean
}

function BannerStars({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <StarEmblem
          key={i}
          variant={i < filled ? 'filled' : 'muted'}
          className={cn('h-4 w-4', i < filled ? 'opacity-100 drop-shadow-sm' : 'opacity-30')}
        />
      ))}
    </div>
  )
}

function HeroProgressRing({ done, total }: { done: number; total: number }) {
  const t = Math.max(total || 1, 1)
  const pct = Math.min(1, Math.max(0, done / t))
  const r = 20
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-12 w-12 -rotate-90"
      viewBox="0 0 48 48"
      aria-hidden
    >
      <circle
        className="text-white/20"
        cx="24"
        cy="24"
        fill="none"
        r={r}
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle
        className="text-white transition-[stroke-dashoffset] duration-500 ease-out"
        cx="24"
        cy="24"
        fill="none"
        r={r}
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ChecklistStarScreen({
  levelId,
  starId,
  embedInLearningPath = false,
}: ChecklistStarScreenProps) {
  const navigate = useNavigate()
  const { data: myPath } = useMyLearningPath()
  const probationRoadmapTopics = useMemo(() => {
    if (!embedInLearningPath || !myPath) return []
    return [...(myPath.roadmapTopics ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [embedInLearningPath, myPath])
  const probationMilestones = useMemo(() => {
    if (!embedInLearningPath || !myPath) return []
    return myPath.milestones
      .filter((m) => m.minCareerLevel === 'tap_su')
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [embedInLearningPath, myPath])

  /** Tập sự trên `/learning-path`: ưu tiên dữ liệu probation (milestone và/hoặc roadmap topic). Nếu chỉ có topic mà không có milestone, vẫn phải hiển thị checklist — tránh rơi về API sao rỗng. */
  const useProbationFlow =
    embedInLearningPath &&
    levelId === 'tap_su' &&
    (probationMilestones.length > 0 || probationRoadmapTopics.length > 0)
  const { data, isLoading } = useLearningChecklist(levelId, starId, !useProbationFlow)
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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const levelName = LEVEL_VI[levelId] ?? levelId
  const probationStepCount =
    probationRoadmapTopics.length > 0 ? probationRoadmapTopics.length : probationMilestones.length
  const total = useProbationFlow ? probationStepCount : sortedItems.length
  const doneCount = useProbationFlow
    ? probationMilestones.filter((m) => m.status === 'done').length
    : sortedItems.filter((i) => checklist.isCompleted(i.id)).length

  const currentItem = useProbationFlow
    ? probationMilestones.find((m) => m.status === 'in_progress')
    : sortedItems.find((i) => checklist.isUnlocked(i.id) && !checklist.isCompleted(i.id))

  const tasks = useMemo(() => {
    if (useProbationFlow && probationRoadmapTopics.length > 0) {
      const doneMilestones = probationMilestones.filter((m) => m.status === 'done').length
      const currentMilestoneIndex = probationMilestones.findIndex((m) => m.status === 'in_progress')
      const currentIndex =
        currentMilestoneIndex >= 0
          ? currentMilestoneIndex
          : doneMilestones < probationRoadmapTopics.length
            ? doneMilestones
            : probationRoadmapTopics.length - 1
      return probationRoadmapTopics.map((topic, idx) => ({
        id: topic.id,
        title: topic.topic,
        order: topic.sortOrder,
        description: topic.objectives.map((o) => o.objective).join('\n'),
        completedAt:
          idx < doneMilestones
            ? (probationMilestones[Math.min(idx, probationMilestones.length - 1)]?.completedAt ??
              null)
            : null,
        kind:
          idx < doneMilestones
            ? ('done' as const)
            : idx === currentIndex
              ? ('current' as const)
              : ('locked' as const),
        objectives: topic.objectives,
      }))
    }

    if (useProbationFlow) {
      return probationMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        order: m.sortOrder,
        description: m.description,
        completedAt: m.completedAt,
        kind:
          m.status === 'done'
            ? ('done' as const)
            : m.status === 'in_progress'
              ? ('current' as const)
              : ('locked' as const),
        objectives: [],
      }))
    }

    return sortedItems.map((it) => ({
      id: it.id,
      title: it.title,
      order: it.order,
      description: null as string | null,
      completedAt: null as string | null,
      kind: rowKind(sortedItems, it.id, checklist),
      objectives: [],
    }))
  }, [useProbationFlow, probationRoadmapTopics, probationMilestones, sortedItems, checklist])

  const activeTaskId = expandedTaskId ?? currentItem?.id ?? tasks[0]?.id ?? null

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
    <div
      className={cn(
        'flex flex-col bg-app-canvas text-base text-foreground',
        embedInLearningPath ? 'min-h-0' : '-m-5 min-h-[calc(100vh-3rem)] md:-m-6 lg:-m-8'
      )}
    >
      {!embedInLearningPath ? (
        <div className="page-toolbar-gradient">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 motion-safe:animate-[dash-shimmer_10s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background:
                'linear-gradient(110deg, transparent 0%, rgb(79 70 229 / 0.08) 50%, transparent 90%)',
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
                    levelId: levelId as
                      | 'tap_su'
                      | 'biet_viec'
                      | 'duoc_viec'
                      | 'dong_gop_ket_qua'
                      | 'tuong',
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
      ) : null}

      <div className="page-shell">
        {isLoading ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <div>
                <Skeleton className="mb-2 h-5 w-48 rounded-md" />
                <Skeleton className="mb-4 h-40 w-full max-w-3xl rounded-3xl" />
              </div>
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonApprovalCardRow key={i} />
              ))}
            </div>
            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <Skeleton className="mb-3 h-10 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-bold uppercase tracking-widest text-gray-500">{levelName}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
              <span className="font-bold uppercase tracking-widest text-primary-600">
                Sao {starId}
              </span>
            </nav>

            <div className="relative mb-8 overflow-hidden rounded-3xl vcb-banner-gradient px-6 py-8 text-white shadow-xl sm:px-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-white">
                      Level 1
                    </span>
                    <BannerStars filled={Math.min(doneCount, 5)} total={5} />
                  </div>
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
                    Sao {starId} — {levelName}
                  </h1>
                  <p className="max-w-xl text-sm font-medium text-white/80">
                    Bắt đầu hành trình chinh phục kỹ năng chuyên môn tại VCB.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 backdrop-blur-md">
                  <div className="text-right">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                      Tiến độ
                    </span>
                    <span className="text-[36px] font-bold leading-none tabular-nums text-white">
                      {doneCount}/{total || 5}
                    </span>
                  </div>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white/20">
                    <ListChecks
                      className="relative z-[1] h-5 w-5 text-white"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <HeroProgressRing done={doneCount} total={total || 5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Danh sách nhiệm vụ</h2>
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-[12px] font-semibold text-primary-700">
                    Ấn vào để xem chi tiết
                  </span>
                </div>
                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      Chưa có nhiệm vụ cho mốc này. Thử tải lại trang; nếu vẫn trống, liên hệ quản
                      lý hoặc đơn vị đào tạo.
                    </p>
                  ) : (
                    tasks.map((it) => {
                      const doneDate = it.completedAt
                        ? new Date(it.completedAt).toLocaleDateString('vi-VN')
                        : undefined
                      return (
                        <ChecklistTaskCard
                          key={it.id}
                          id={it.id}
                          title={it.title}
                          kind={it.kind}
                          expanded={activeTaskId === it.id}
                          onToggle={() =>
                            setExpandedTaskId((prev) => (prev === it.id ? null : it.id))
                          }
                          objective={it.description?.trim() || 'Chưa có objective cho đầu mục này.'}
                          objectiveList={it.objectives}
                          subtitle={
                            it.kind === 'done'
                              ? doneDate
                                ? `Hoàn thành ${doneDate}`
                                : 'Đã hoàn thành'
                              : it.kind === 'current'
                                ? 'Ấn vào để xem chi tiết'
                                : 'Hoàn thành nhiệm vụ trước để mở'
                          }
                          primaryAction={
                            it.kind === 'done'
                              ? it.order === 2
                                ? { label: 'Xem kết quả', onClick: () => {} }
                                : { label: 'Xem bằng chứng', onClick: () => {} }
                              : it.kind === 'current'
                                ? useProbationFlow
                                  ? undefined
                                  : { label: 'Nộp bằng chứng', onClick: onPickFile }
                                : undefined
                          }
                        />
                      )
                    })
                  )}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="sticky top-24 flex flex-col gap-6">
                  {!useProbationFlow ? (
                    <div
                      className={cn(
                        'rounded-[12px] bg-white p-6 shadow-lg ring-1 ring-gray-100',
                        CARD_ENTRANCE_HOVER
                      )}
                      style={staggerStyle(0)}
                    >
                      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Paperclip
                          className="h-5 w-5 shrink-0 text-primary-600"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Nộp bằng chứng
                      </h3>
                      <div className="space-y-6">
                        <button
                          type="button"
                          className="group w-full cursor-pointer rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/50 p-8 text-center transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={onPickFile}
                          disabled={!currentItem || submit.isPending}
                        >
                          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110">
                            <CloudUpload
                              className="h-6 w-6 text-primary-600"
                              strokeWidth={2}
                              aria-hidden
                            />
                          </div>
                          <p className="text-sm font-bold text-primary-700">Tải tệp lên</p>
                          <p className="mt-1 text-[13px] text-primary-600/80">
                            Hoặc nhấn để chọn từ máy tính (Tối đa 25MB)
                          </p>
                          <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                            onChange={onFileChange}
                          />
                        </button>
                        <div>
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-gray-500"
                            htmlFor="evidence-note"
                          >
                            Mô tả
                          </label>
                          <textarea
                            id="evidence-note"
                            className="w-full resize-y rounded-lg border-0 bg-primary-50/40 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600"
                            placeholder="Mô tả ngắn gọn về tài liệu bạn nộp…"
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="w-full rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:shadow-primary-600/35 active:scale-[0.98] disabled:opacity-50"
                          disabled={!currentItem || submit.isPending}
                          onClick={onPickFile}
                        >
                          {submit.isPending ? 'Đang gửi…' : 'Nộp bài'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'rounded-[12px] border border-primary-100/50 bg-primary-50/50 p-6 text-center',
                      CARD_ENTRANCE_HOVER
                    )}
                    style={staggerStyle(1)}
                  >
                    <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary-600">
                      Bài đã nộp gần nhất
                    </h4>
                    {(submissions ?? []).length > 0 ? (
                      <ul className="divide-y divide-primary-100/60 text-left text-sm">
                        {(submissions ?? []).slice(0, 5).map((s) => (
                          <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="font-semibold text-gray-900">{s.fileName}</div>
                            <div className="mt-0.5 text-[13px] text-gray-500">
                              {new Date(s.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                              <span className="font-medium text-primary-600">
                                {s.status === 'ACCEPTED'
                                  ? 'Đã duyệt'
                                  : s.status === 'PENDING'
                                    ? 'Chờ duyệt'
                                    : 'Từ chối'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-4">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/60">
                          <Clock className="h-8 w-8 text-gray-300" strokeWidth={1.5} aria-hidden />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Chưa có bài nộp</p>
                        <p className="mt-1 text-[13px] text-gray-500">
                          Các bài nộp của bạn sẽ xuất hiện tại đây sau khi được hệ thống ghi nhận.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl bg-reward-bg p-6 shadow-[var(--shadow-card)]">
                    <span className="inline-block rounded-full bg-warning/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-warning">
                      Reward preview
                    </span>
                    <h4 className="mt-3 text-lg font-bold text-gray-900">Huy hiệu Sao {starId}</h4>
                    <p className="mt-2 max-w-[18rem] text-sm text-gray-700">
                      Hoàn thành {total || 5} nhiệm vụ để nhận huy hiệu mốc và +500 XP vào Skill
                      Matrix của bạn.
                    </p>
                    <Trophy
                      className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 text-warning/20 transition-transform duration-500 group-hover:scale-110"
                      strokeWidth={1.25}
                      aria-hidden
                    />
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
          </div>
        )}
      </div>
    </div>
  )
}

function ChecklistTaskCard({
  id,
  title,
  kind,
  objective,
  objectiveList,
  expanded,
  onToggle,
  subtitle,
  primaryAction,
}: {
  id: string
  title: string
  kind: 'done' | 'current' | 'locked'
  objective: string
  objectiveList?: Array<{
    id: string
    objective: string
    rowOrder: number
    materialRef: string | null
    trainer: string | null
    assessment: string | null
  }>
  expanded: boolean
  onToggle: () => void
  subtitle?: string
  primaryAction?: { label: string; onClick: () => void }
}) {
  const parseMaterialRef = (value: string | null) => {
    if (!value)
      return {
        daoTao: null as string | null,
        slide: null as string | null,
        taiLieu: null as string | null,
        raw: null as string | null,
      }
    const text = value.trim()
    const daoTao =
      text
        .match(/(?:Đào tạo|Dao tao)\s*:?\s*(.+?)(?=(?:\s*(?:Slide|Tài liệu|Tai lieu)\s*:)|$)/i)?.[1]
        ?.trim() ?? null
    const slide =
      text
        .match(/Slide\s*:?\s*(.+?)(?=(?:\s*(?:Đào tạo|Dao tao|Tài liệu|Tai lieu)\s*:)|$)/i)?.[1]
        ?.trim() ?? null
    const taiLieu =
      text
        .match(/(?:Tài liệu|Tai lieu)\s*:?\s*(.+?)(?=(?:\s*(?:Đào tạo|Dao tao|Slide)\s*:)|$)/i)?.[1]
        ?.trim() ?? null
    const raw = text.replace(/^(?:Tài liệu|Tai lieu)\s*:?\s*/i, '').trim()
    return { daoTao, slide, taiLieu, raw: raw.length > 0 ? raw : null }
  }

  const urlRegex = /(https?:\/\/[^\s]+)/gi
  const renderTextWithLinks = (value: string) => {
    const parts = value.split(urlRegex)
    return (
      <>
        {parts.map((part, idx) => {
          if (/^https?:\/\//i.test(part)) {
            return (
              <a
                key={`${part}-${idx}`}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="break-all font-medium text-primary-700 hover:text-primary-800"
              >
                {part}
              </a>
            )
          }
          return <span key={`${idx}-${part.slice(0, 8)}`}>{part}</span>
        })}
      </>
    )
  }

  const objectiveContent =
    objectiveList && objectiveList.length > 0 ? (
      <ul className="space-y-2">
        {objectiveList.map((obj, index) => (
          <li
            key={obj.id}
            className="rounded-lg border border-primary-100/70 bg-white p-3 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-800">
              {index + 1}. {obj.objective}
            </p>
            {(() => {
              const material = parseMaterialRef(obj.materialRef)
              const hasAnyMeta =
                !!material.daoTao ||
                !!material.slide ||
                !!material.taiLieu ||
                !!material.raw ||
                !!obj.trainer ||
                !!obj.assessment
              if (!hasAnyMeta) return null
              return (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {material.daoTao ? (
                    <p className="leading-relaxed">
                      <span className="font-semibold text-gray-500">Đào tạo:</span>{' '}
                      {renderTextWithLinks(material.daoTao)}
                    </p>
                  ) : null}
                  {material.slide ? (
                    <p className="leading-relaxed">
                      <span className="font-semibold text-gray-500">Slide:</span>{' '}
                      {renderTextWithLinks(material.slide)}
                    </p>
                  ) : null}
                  {material.taiLieu ? (
                    <p className="leading-relaxed">
                      <span className="font-semibold text-gray-500">Tài liệu:</span>{' '}
                      {renderTextWithLinks(material.taiLieu)}
                    </p>
                  ) : null}
                  {!material.daoTao && !material.slide && !material.taiLieu && material.raw ? (
                    <p className="leading-relaxed">{renderTextWithLinks(material.raw)}</p>
                  ) : null}
                  <p className="leading-relaxed">
                    <span className="font-semibold text-gray-500">Trainer:</span>{' '}
                    {obj.trainer || '-'}
                  </p>
                  <p className="leading-relaxed">
                    <span className="font-semibold text-gray-500">Phương thức đánh giá:</span>{' '}
                    {obj.assessment || '-'}
                  </p>
                </div>
              )
            })()}
          </li>
        ))}
      </ul>
    ) : (
      <>{objective}</>
    )

  if (kind === 'locked') {
    return (
      <div className="rounded-xl bg-gray-50/80 p-5 opacity-90 ring-1 ring-gray-100/80 transition-opacity hover:opacity-100">
        <button
          type="button"
          className="flex w-full items-start gap-4 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`objective-${id}`}
        >
          <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-gray-300 bg-white" />
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold text-gray-600">{title}</h4>
            {subtitle ? (
              <p className="mt-1 text-sm leading-relaxed text-gray-400">{subtitle}</p>
            ) : null}
          </div>
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" strokeWidth={2} aria-hidden />
        </button>
        {expanded ? (
          <div
            id={`objective-${id}`}
            className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-500"
          >
            {objectiveContent}
          </div>
        ) : null}
      </div>
    )
  }

  if (kind === 'done') {
    return (
      <div className="rounded-xl border-l-4 border-success bg-success-muted/40 p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 gap-4 text-left"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`objective-${id}`}
          >
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-success bg-success text-[11px] font-bold text-white">
              ✓
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-gray-900">{title}</h4>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-500 transition-transform',
                    expanded && 'rotate-180'
                  )}
                  aria-hidden
                />
              </div>
              {subtitle ? (
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{subtitle}</p>
              ) : null}
            </div>
          </button>
          {expanded ? (
            <div
              id={`objective-${id}`}
              className="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700"
            >
              {objectiveContent}
            </div>
          ) : null}
          {primaryAction ? (
            <button
              type="button"
              className="self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative rounded-xl border-l-4 border-primary-600 bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        className="flex w-full items-start gap-4 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`objective-${id}`}
      >
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-primary-600 bg-white">
          <span
            className="h-2 w-2 rounded-sm bg-primary-600 opacity-0 transition-opacity group-hover:opacity-20"
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-primary-600">{title}</h4>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-primary-600 transition-transform',
                  expanded && 'rotate-180'
                )}
                aria-hidden
              />
            </div>
            <span className="shrink-0 rounded bg-primary-100/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-700">
              Active
            </span>
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{subtitle}</p>
          ) : null}
        </div>
      </button>
      {expanded ? (
        <div
          id={`objective-${id}`}
          className="mt-3 rounded-lg bg-primary-50/50 px-3 py-2 text-sm text-gray-700"
        >
          {objectiveContent}
        </div>
      ) : null}
      {primaryAction ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95"
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </button>
        </div>
      ) : null}
    </div>
  )
}
