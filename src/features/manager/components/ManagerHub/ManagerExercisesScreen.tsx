import { useMemo, useState } from 'react'
import { GripVertical, ImageIcon, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { LEVEL_LABELS, LEVELS, STARS_PER_LEVEL, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  MOCK_EXERCISES_BY_LEVEL,
  type ManagerExerciseItem,
} from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

function starOptionsForLevel(level: LevelCode): number[] {
  const max = STARS_PER_LEVEL[level]
  if (max <= 0) return [1, 2]
  return Array.from({ length: max }, (_, i) => i + 1)
}

function getItems(level: LevelCode, star: number): ManagerExerciseItem[] {
  const block = MOCK_EXERCISES_BY_LEVEL[level]
  if (!block) return []
  return block[star] ?? []
}

export function ManagerExercisesScreen() {
  const [level, setLevel] = useState<LevelCode>('tap_su')
  const stars = useMemo(() => starOptionsForLevel(level), [level])
  const [star, setStar] = useState(1)

  const safeStar = stars.includes(star) ? star : stars[0] ?? 1
  const items = getItems(level, safeStar)

  return (
    <ManagerScreenLayout
      title="Bài tập & checklist lộ trình"
      subtitle="CRUD mục checklist theo cấp độ và sao. Member làm tuần tự — mục sau chỉ mở khi mục trước hoàn thành."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {LEVELS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setLevel(code)
              setStar(1)
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors md:text-sm',
              level === code
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30'
            )}
          >
            {LEVEL_LABELS[code]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {STARS_PER_LEVEL[level] <= 0 ? 'Giai đoạn / mục' : 'Sao'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {stars.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStar(s)}
              className={cn(
                'min-w-[2.25rem] rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums',
                safeStar === s
                  ? 'border-[#D4A017] bg-[#FFF9E6] text-[#8B6914] ring-1 ring-[#D4A017]/40'
                  : 'border-border bg-card text-muted-foreground hover:border-[#D4A017]/50'
              )}
            >
              {STARS_PER_LEVEL[level] <= 0 ? `Mục ${s}` : `${s}★`}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'rounded-xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-primary/10 md:p-6',
          CARD_ENTRANCE_HOVER
        )}
      >
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có mục checklist cho{' '}
              <span className="font-semibold text-foreground">
                {LEVEL_LABELS[level]} ·{' '}
                {STARS_PER_LEVEL[level] <= 0 ? `mục ${safeStar}` : `sao ${safeStar}`}
              </span>
              .
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => toast.info('Thêm mục checklist (demo) — nối API.')}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Thêm mục đầu tiên
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className={cn(
                  'flex flex-wrap items-start gap-3 rounded-lg border border-border bg-gradient-to-r from-card to-primary/[0.02] p-3 md:items-center',
                  CARD_ENTRANCE_HOVER
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                  <GripVertical className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {it.order}
                    </span>
                    <span className="font-semibold text-foreground">{it.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-8 text-xs">
                    {it.requiresEvidence ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 font-medium text-teal-900">
                        <ImageIcon className="h-3 w-3" strokeWidth={2} />
                        Cần bằng chứng
                      </span>
                    ) : null}
                    {it.lockedUntilPrev ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-900">
                        <Lock className="h-3 w-3" strokeWidth={2} />
                        Khóa đến khi xong mục trước
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full shrink-0 justify-end gap-1 sm:w-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toast.info('Sửa mục (demo)')}
                  >
                    Sửa
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-rose-700 hover:text-rose-800"
                    onClick={() => toast.info('Xóa mục (demo)')}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => toast.info('Thêm mục mới vào cuối (demo)')}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Thêm mục
          </Button>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
