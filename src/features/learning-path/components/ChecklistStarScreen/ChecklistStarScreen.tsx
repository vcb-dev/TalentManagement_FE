import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CloudUpload,
  ListChecks,
  Lock,
  Paperclip,
  Loader2,
} from 'lucide-react'
import { StarEmblem } from '@/components/icons/StarEmblem'
import {
  useLearningChecklist,
  useMyLearningPath,
  useStarSubmissions,
  useSubmitEvidence,
} from '@/features/learning-path/hooks'
import { useChecklistItem } from '@/features/learning-path/components/ChecklistItem/useChecklistItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton, SkeletonApprovalCardRow } from '@/components/ui/skeleton'
import { CARD_ENTRANCE, CARD_ENTRANCE_HOVER, staggerStyle } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { TextareaController } from '@/components/ui/form-controllers'

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
  /** If true, filter roadmap topics by star number parsed from topic name */
  filterByStar?: boolean
  currentStars?: number
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
  filterByStar = false,
  currentStars = 0,
}: ChecklistStarScreenProps) {
  const navigate = useNavigate()
  const { data: myPath, isLoading: isPathLoading } = useMyLearningPath()
  const roadmapTopicsByLevel = useMemo(() => {
    if (!embedInLearningPath || !myPath) return []
    let topics = (myPath.roadmapTopics ?? [])
      .filter((t: any) => t.levelId === levelId)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    // Filter by star number when enabled (e.g. biet_viec Sao 1-6)
    // NOTE: The user now wants to see "toàn bộ lộ trình", so we don't strictly filter OUT other stars,
    // but we might still use starId to highlight or scroll.
    // For now, if embedInLearningPath is true, we show all but mark as locked below.
    if (filterByStar && starId && !embedInLearningPath) {
      const starNum = parseInt(starId) || 1
      topics = topics.filter((t: any) => {
        const match = t.topic.match(/^Sao\s*(\d+)/i)
        if (match) return parseInt(match[1]) === starNum
        return true
      })
    }

    return topics
  }, [embedInLearningPath, myPath, levelId, filterByStar, starId])

  const probationMilestones = useMemo(() => {
    if (!embedInLearningPath || !myPath) return []
    return myPath.milestones
      .filter((m) => m.minCareerLevel === levelId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [embedInLearningPath, myPath, levelId])

  /** Nếu có roadmap topics cho level này, ưu tiên dùng. */
  const useProbationFlow =
    embedInLearningPath && (roadmapTopicsByLevel.length > 0 || probationMilestones.length > 0)
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
  const evidenceForm = useForm<{ note: string }>({ defaultValues: { note: '' } })
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [_, startTransition] = useTransition()

  const handleToggleTask = useCallback((id: string) => {
    startTransition(() => {
      setExpandedTaskId((prev) => (prev === id ? null : id))
    })
  }, [])

  const handleSelectObjective = useCallback((id: string) => {
    startTransition(() => {
      setSelectedObjectiveId(id)
    })
  }, [])

  const levelName = LEVEL_VI[levelId] ?? levelId
  const total = useProbationFlow
    ? roadmapTopicsByLevel.length || probationMilestones.length
    : sortedItems.length
  const doneCount = useProbationFlow
    ? probationMilestones.filter((m) => m.status === 'done').length
    : sortedItems.filter((i) => checklist.isCompleted(i.id)).length

  const tasks = useMemo(() => {
    if (useProbationFlow && roadmapTopicsByLevel.length > 0) {
      return roadmapTopicsByLevel.map((topic) => {
        const titleRaw = topic.topic.trim()
        const match = titleRaw.match(/^Sao\s*(\d+)/i)
        const topicStar = match && match[1] ? parseInt(match[1]) : 1

        const isDone = topicStar <= currentStars
        const isCurrent = topicStar === currentStars + 1
        const isLocked = topicStar > currentStars + 1

        return {
          id: topic.id,
          title: titleRaw,
          order: topic.sortOrder,
          description: topic.objectives.map((o) => o.objective).join('\n'),
          completedAt: null, // We don't have per-topic completion date in this simplified view yet
          kind: isDone ? ('done' as const) : isCurrent ? ('current' as const) : ('locked' as const),
          objectives: topic.objectives,
        }
      })
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
  }, [
    useProbationFlow,
    roadmapTopicsByLevel,
    probationMilestones,
    sortedItems,
    checklist,
    currentStars,
  ])

  const currentItem = useProbationFlow
    ? tasks.find((t) => t.kind === 'current')
    : sortedItems.find((i) => checklist.isUnlocked(i.id) && !checklist.isCompleted(i.id))

  const activeTaskId = expandedTaskId ?? currentItem?.id ?? tasks[0]?.id ?? null

  useEffect(() => {
    if (activeTaskId) {
      const task = tasks.find((t) => t.id === activeTaskId)
      const currentSelectedBelongsToActive = task?.objectives?.some(
        (o) => o.id === selectedObjectiveId
      )
      const firstObjectiveId = task?.objectives?.[0]?.id
      if (firstObjectiveId && !currentSelectedBelongsToActive) {
        setSelectedObjectiveId(firstObjectiveId)
      }
    }
  }, [activeTaskId, tasks, selectedObjectiveId])

  const selectedObjective = useMemo(() => {
    if (!selectedObjectiveId) return null
    for (const t of tasks) {
      if (t.objectives) {
        const obj = t.objectives.find((o) => o.id === selectedObjectiveId)
        if (obj) return obj
      }
    }
    return null
  }, [tasks, selectedObjectiveId])

  const onPickFile = () => fileRef.current?.click()

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.mp4']

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(
        `Định dạng file ${ext} không được hỗ trợ. Vui lòng nộp: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
      e.target.value = ''
      return
    }

    // Validate size
    const targetItemId = selectedObjective ? selectedObjective.id : currentItem?.id
    if (!targetItemId) return

    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file trước khi nộp')
      return
    }

    const targetItemId = selectedObjective ? selectedObjective.id : currentItem?.id
    if (!targetItemId) return

    submit.mutate(
      { levelId, starId, itemId: targetItemId, file: selectedFile },
      {
        onSuccess: () => {
          evidenceForm.reset({ note: '' })
          setSelectedFile(null)
          if (fileRef.current) fileRef.current.value = ''
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
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap rounded-[10px] border-primary-600/20 bg-white px-3.5 py-2 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50 md:text-base"
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
            </Button>
          </div>
          <span className="relative rounded-full border border-primary-600/15 bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
            Đang học
          </span>
        </div>
      ) : null}

      <div className={cn(embedInLearningPath ? 'min-w-0 px-0 py-1 sm:py-2' : 'page-shell')}>
        {isLoading || (embedInLearningPath && isPathLoading) ? (
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 lg:grid-cols-12">
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
          <div className="mx-auto max-w-[1400px]">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold uppercase tracking-widest text-gray-500">{levelName}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
              <span className="font-bold uppercase tracking-widest text-primary-600">
                Toàn bộ lộ trình
              </span>
            </nav>

            <div
              className={cn(
                'relative mb-8 overflow-hidden rounded-3xl vcb-banner-gradient text-white shadow-xl',
                embedInLearningPath ? 'px-4 py-6 sm:px-6 sm:py-8' : 'px-6 py-8 sm:px-8'
              )}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold uppercase tracking-tighter text-white">
                      Level 1
                    </span>
                    <BannerStars filled={Math.min(doneCount, 5)} total={5} />
                  </div>
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
                    Lộ trình học {levelName}
                  </h1>
                  <p className="max-w-xl text-sm font-medium text-white/80">
                    Bắt đầu hành trình chinh phục kỹ năng chuyên môn tại VCB.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 backdrop-blur-md">
                  <div className="text-right">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">
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
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
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
                    <div className="space-y-10">
                      {[1, 2, 3, 4, 5, 6].map((starNum) => {
                        const starTasks = tasks.filter((t) => {
                          const match = t.title?.match(/^Sao\s*(\d+)/i)
                          return match && match[1] ? parseInt(match[1]) === starNum : starNum === 1
                        })
                        if (starTasks.length === 0) return null

                        const isUnlocked = starNum <= currentStars + 1
                        const isDone = starNum <= currentStars

                        return (
                          <div key={starNum} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <h3
                                className={cn(
                                  'text-sm font-black uppercase tracking-[0.2em]',
                                  isUnlocked ? 'text-primary-600' : 'text-gray-400'
                                )}
                              >
                                {isDone ? '✓ ' : !isUnlocked ? '🔒 ' : '⭐ '}
                                Sao {starNum}
                              </h3>
                              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                            </div>
                            <div className="space-y-4">
                              {starTasks.map((it, idx) => {
                                const doneDate = it.completedAt
                                  ? new Date(it.completedAt).toLocaleDateString('vi-VN')
                                  : undefined
                                return (
                                  <div
                                    key={it.id}
                                    className={CARD_ENTRANCE}
                                    style={staggerStyle(idx, 60)}
                                  >
                                    <ChecklistTaskCard
                                      id={it.id}
                                      title={it.title}
                                      kind={it.kind}
                                      expanded={activeTaskId === it.id}
                                      onToggle={handleToggleTask}
                                      objective={
                                        it.description?.trim() ||
                                        'Chưa có objective cho đầu mục này.'
                                      }
                                      objectiveList={it.objectives}
                                      subtitle={
                                        it.kind === 'done'
                                          ? doneDate
                                            ? `Hoàn thành ${doneDate}`
                                            : 'Đã hoàn thành'
                                          : it.kind === 'current'
                                            ? 'Ấn vào để xem chi tiết'
                                            : `Mở khóa sau khi hoàn thành Sao ${starNum - 1}`
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
                                      selectedObjectiveId={selectedObjectiveId}
                                      onSelectObjective={handleSelectObjective}
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="sticky top-24 flex flex-col gap-6">
                  {!useProbationFlow && !selectedObjective ? (
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
                      <Form {...evidenceForm}>
                        <div className="space-y-6">
                          <Button
                            type="button"
                            variant="ghost"
                            className="group h-auto w-full cursor-pointer rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/50 p-8 text-center font-normal normal-case tracking-normal transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <p className="text-sm font-bold text-primary-700">
                              {selectedFile ? `Đã chọn: ${selectedFile.name}` : 'Tải tệp lên'}
                            </p>
                            <p className="mt-1 text-sm text-primary-600/80">
                              {selectedFile
                                ? 'Nhấn để chọn file khác'
                                : 'Hoặc nhấn để chọn từ máy tính (Tối đa 25MB)'}
                            </p>
                          </Button>
                          <Input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                            onChange={onFileChange}
                          />
                          <TextareaController
                            control={evidenceForm.control}
                            name="note"
                            label="Mô tả"
                            labelClassName="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500"
                            id="evidence-note"
                            rows={4}
                            placeholder="Mô tả ngắn gọn về tài liệu bạn nộp…"
                            textareaClassName="w-full resize-y rounded-lg border-0 bg-primary-50/40 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full rounded-lg border-0 bg-gradient-to-br from-primary-600 to-primary-700 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-transparent hover:shadow-primary-600/35 active:scale-[0.98] disabled:opacity-50"
                            disabled={!currentItem || submit.isPending || !selectedFile}
                            onClick={handleUpload}
                          >
                            {submit.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              'Nộp bài'
                            )}
                          </Button>
                        </div>
                      </Form>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'rounded-[12px] border border-primary-100/50 bg-primary-50/50 p-6',
                      selectedObjective
                        ? 'text-left bg-white shadow-lg ring-1 ring-gray-100 border-none'
                        : 'text-center',
                      CARD_ENTRANCE_HOVER
                    )}
                    style={staggerStyle(1)}
                  >
                    <h4
                      className={cn(
                        'mb-4 font-bold text-primary-600',
                        selectedObjective
                          ? 'text-base uppercase tracking-normal'
                          : 'text-xs uppercase tracking-widest'
                      )}
                    >
                      {selectedObjective ? selectedObjective.objective : 'Bài đã nộp gần nhất'}
                    </h4>

                    {selectedObjective ? (
                      <div className="mb-6">
                        <Form {...evidenceForm}>
                          <div className="space-y-4">
                            <Button
                              type="button"
                              variant="ghost"
                              className="group h-auto w-full cursor-pointer rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/50 p-6 text-center font-normal normal-case tracking-normal transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={onPickFile}
                              disabled={submit.isPending}
                            >
                              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110">
                                <CloudUpload
                                  className="h-5 w-5 text-primary-600"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              </div>
                              <p className="text-sm font-bold text-primary-700">
                                {selectedFile ? `Đã chọn: ${selectedFile.name}` : 'Tải tệp lên'}
                              </p>
                            </Button>
                            <Input
                              ref={fileRef}
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                              onChange={onFileChange}
                            />
                            <TextareaController
                              control={evidenceForm.control}
                              name="note"
                              label="Mô tả minh chứng"
                              labelClassName="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500"
                              id="evidence-note"
                              rows={3}
                              placeholder="Mô tả..."
                              textareaClassName="w-full resize-y rounded-lg border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full rounded-lg border-0 bg-gradient-to-br from-primary-600 to-primary-700 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-transparent hover:shadow-primary-600/35 active:scale-[0.98] disabled:opacity-50"
                              disabled={submit.isPending || !selectedFile}
                              onClick={handleUpload}
                            >
                              {submit.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              ) : (
                                'Nộp bài'
                              )}
                            </Button>
                          </div>
                        </Form>
                      </div>
                    ) : null}

                    {selectedObjective && (
                      <div className="mt-6 border-t border-gray-100 pt-4">
                        <h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                          Lịch sử bài nộp
                        </h5>
                      </div>
                    )}

                    {(submissions ?? []).length > 0 ? (
                      <ul className="divide-y divide-primary-100/60 text-left text-sm">
                        {(submissions ?? []).slice(0, 5).map((s) => (
                          <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="font-semibold text-gray-900">{s.fileName}</div>
                            <div className="mt-0.5 text-sm text-gray-500">
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
                      <div className={cn('py-4', selectedObjective && 'text-center')}>
                        {!selectedObjective && (
                          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/60">
                            <Clock
                              className="h-8 w-8 text-gray-300"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-600">Chưa có bài nộp</p>
                        {!selectedObjective && (
                          <p className="mt-1 text-sm text-gray-500">
                            Các bài nộp của bạn sẽ xuất hiện tại đây sau khi được hệ thống ghi nhận.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/dashboard"
                    className="block text-center text-sm font-semibold text-primary-600 hover:underline"
                  >
                    ← Về tổng quan học tập
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

const ChecklistTaskCard = memo(function ChecklistTaskCard({
  id,
  title,
  kind,
  objective,
  objectiveList,
  expanded,
  onToggle,
  subtitle,
  primaryAction,
  selectedObjectiveId,
  onSelectObjective,
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
  onToggle: (id: string) => void
  subtitle?: string
  primaryAction?: { label: string; onClick: () => void }
  selectedObjectiveId?: string | null
  onSelectObjective?: (id: string) => void
}) {
  const parseMaterialRef = useCallback((value: string | null) => {
    if (!value)
      return {
        daoTao: null as string | null,
        slide: null as string | null,
        taiLieu: null as string | null,
        raw: null as string | null,
      }

    // Try parsing as JSON first (Lark array format)
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        let daoTao: string | null = null
        let slide: string | null = null
        let taiLieu: string | null = null
        const otherLinks: string[] = []

        parsed.forEach((item) => {
          if (!item.name || !item.link) return
          const n = String(item.name).toLowerCase()
          if (n.includes('đào tạo') || n.includes('dao tao')) {
            daoTao = item.link
          } else if (n.includes('slide')) {
            slide = item.link
          } else if (
            n.includes('tài liệu') ||
            n.includes('tai lieu') ||
            n.includes('sách') ||
            n.includes('sach')
          ) {
            taiLieu = item.link
          } else {
            otherLinks.push(`${item.name}: ${item.link}`)
          }
        })

        return {
          daoTao,
          slide,
          taiLieu,
          raw: otherLinks.length > 0 ? otherLinks.join(' | ') : null,
        }
      }
    } catch (e) {
      // Ignore error and fall back to regex
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
  }, [])

  const urlRegex = useMemo(() => /(https?:\/\/[^\s]+)/gi, [])

  const renderTextWithLinks = useCallback(
    (value: string) => {
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
    },
    [urlRegex]
  )

  const objectiveContent =
    objectiveList && objectiveList.length > 0 ? (
      <div className="space-y-2">
        {objectiveList.map((obj, index) => {
          const isSelected = selectedObjectiveId === obj.id
          const material = parseMaterialRef(obj.materialRef)
          const hasMeta =
            !!material.daoTao ||
            !!material.slide ||
            !!material.taiLieu ||
            !!material.raw ||
            !!obj.trainer ||
            !!obj.assessment

          return (
            <div
              key={obj.id}
              onClick={() => onSelectObjective?.(obj.id)}
              className={cn(
                'group relative flex flex-col rounded-xl border p-3.5 transition-all duration-200',
                onSelectObjective ? 'cursor-pointer hover:shadow-md' : '',
                isSelected
                  ? 'border-primary-500 bg-white ring-1 ring-primary-500 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[14px] mt-0.5 font-medium leading-relaxed transition-colors',
                      isSelected ? 'text-primary-900' : 'text-gray-700 group-hover:text-gray-900'
                    )}
                  >
                    {obj.objective}
                  </p>

                  {isSelected && hasMeta && (
                    <div className="mt-3 grid grid-cols-1 gap-4 border-t border-gray-100 pt-3 text-sm text-gray-800 sm:grid-cols-2">
                      {material.daoTao && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Đào tạo
                          </span>
                          <span className="line-clamp-2">
                            {renderTextWithLinks(material.daoTao)}
                          </span>
                        </div>
                      )}
                      {material.slide && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Slide
                          </span>
                          <span className="line-clamp-2">
                            {renderTextWithLinks(material.slide)}
                          </span>
                        </div>
                      )}
                      {material.taiLieu && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Tài liệu
                          </span>
                          <span className="line-clamp-2">
                            {renderTextWithLinks(material.taiLieu)}
                          </span>
                        </div>
                      )}
                      {material.raw && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Link khác
                          </span>
                          <span className="line-clamp-2">{renderTextWithLinks(material.raw)}</span>
                        </div>
                      )}
                      {obj.trainer && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Trainer
                          </span>
                          <span className="line-clamp-2 font-medium text-primary-700">
                            {obj.trainer}
                          </span>
                        </div>
                      )}
                      {obj.assessment && (
                        <div className="col-span-full flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Đánh giá
                          </span>
                          <span className="line-clamp-3 italic text-gray-600">
                            {obj.assessment}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="text-sm text-gray-500 italic px-2">{objective}</div>
    )

  if (kind === 'locked') {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 opacity-60 grayscale transition-all">
        <div className="flex items-center gap-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-400">
            <Lock className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold text-gray-500">{title}</h4>
            <p className="mt-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {subtitle || 'Hoàn thành mốc trước để mở'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'done') {
    return (
      <div
        className={cn(
          'rounded-xl p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-md border-l-4',
          expanded
            ? 'bg-white border-primary-600 ring-primary-100 shadow-md'
            : 'border-success bg-success-muted/40'
        )}
      >
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="ghost"
            className="whitespace-normal h-auto min-w-0 flex-1 justify-start gap-4 p-0 text-left font-normal normal-case tracking-normal hover:bg-transparent"
            onClick={() => onToggle(id)}
            aria-expanded={expanded}
            aria-controls={`objective-${id}`}
          >
            <div
              className={cn(
                'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-colors',
                expanded
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-success bg-success text-white'
              )}
            >
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className={cn(
                    'break-words text-base font-bold transition-colors',
                    expanded ? 'text-primary-600' : 'text-gray-900'
                  )}
                >
                  {title}
                </h4>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-500 transition-transform',
                    expanded && 'rotate-180'
                  )}
                  aria-hidden
                />
              </div>
              {subtitle ? (
                <p className="mt-1 break-words text-sm leading-relaxed text-gray-600">{subtitle}</p>
              ) : null}
            </div>
          </Button>
          {expanded ? (
            <div
              id={`objective-${id}`}
              className="mt-4 rounded-2xl bg-white/60 p-4 shadow-inner ring-1 ring-gray-100/50"
            >
              {objectiveContent}
            </div>
          ) : null}
          {primaryAction ? (
            <Button
              type="button"
              variant="outline"
              className="self-start rounded-lg border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800 shadow-sm hover:bg-gray-50 active:scale-95"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border-l-4 p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-md',
        expanded ? 'border-primary-600 bg-white' : 'border-transparent bg-white/50'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className="whitespace-normal h-auto w-full justify-start gap-4 p-0 text-left font-normal normal-case tracking-normal hover:bg-transparent"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        aria-controls={`objective-${id}`}
      >
        <div
          className={cn(
            'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 bg-white transition-colors',
            expanded ? 'border-primary-600' : 'border-gray-300'
          )}
        >
          <span
            className="h-2 w-2 rounded-sm bg-primary-600 opacity-0 transition-opacity group-hover:opacity-20"
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4
              className={cn(
                'break-words text-base font-bold transition-colors',
                expanded ? 'text-primary-600' : 'text-gray-700'
              )}
            >
              {title}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'shrink-0 rounded px-2 py-0.5 text-xs font-black uppercase tracking-wide transition-all',
                  expanded
                    ? 'bg-primary-100/80 text-primary-700 opacity-100'
                    : 'bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100'
                )}
              >
                {expanded ? 'Active' : 'Xem'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-primary-600 transition-transform',
                  expanded && 'rotate-180'
                )}
                aria-hidden
              />
            </div>
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{subtitle}</p>
          ) : null}
        </div>
      </Button>
      {expanded ? (
        <div
          id={`objective-${id}`}
          className="mt-4 rounded-2xl bg-slate-50/80 p-4 shadow-inner ring-1 ring-gray-100/50"
        >
          {objectiveContent}
        </div>
      ) : null}
      {primaryAction && expanded ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            className="rounded-lg border-0 bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-700 active:scale-[0.98] transition-all"
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
})
