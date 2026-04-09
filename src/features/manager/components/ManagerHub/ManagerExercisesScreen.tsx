import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useCreateManagerRoadmapItem,
  useDeleteManagerRoadmapItem,
  useManagerRoadmapItems,
  useUpdateManagerRoadmapItem,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const LEVEL_LABEL_OPTIONS = ['Tập sự -> Biết việc', 'Biết việc -> Được việc']

type FormState = {
  levelLabel: string
  topic: string
  objective: string
  materialRefs: string[]
  trainer: string
  assessment: string
  rowOrder: string
}

const EMPTY_FORM: FormState = {
  levelLabel: LEVEL_LABEL_OPTIONS[0]!,
  topic: '',
  objective: '',
  materialRefs: [''],
  trainer: '',
  assessment: '',
  rowOrder: '',
}

function splitMaterialRefs(value: string | null): string[] {
  if (!value) return ['']
  const parts = value
    .split(/\r?\n|,/g)
    .map((x) => x.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : ['']
}

export function ManagerExercisesScreen() {
  const [q, setQ] = useState('')
  const [levelLabel, setLevelLabel] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data: items = [], isLoading } = useManagerRoadmapItems({ q, levelLabel, topic: topicFilter })
  const createItem = useCreateManagerRoadmapItem()
  const updateItem = useUpdateManagerRoadmapItem()
  const deleteItem = useDeleteManagerRoadmapItem()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const row of items) {
      const key = `${row.levelLabel}|||${row.topic}`
      const arr = map.get(key)
      if (arr) arr.push(row)
      else map.set(key, [row])
    }
    return Array.from(map.entries())
  }, [items])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, levelLabel: levelLabel || EMPTY_FORM.levelLabel })
    setIsFormOpen(true)
  }

  const startEdit = (id: string) => {
    const row = items.find((x) => x.id === id)
    if (!row) return
    setEditingId(id)
    setForm({
      levelLabel: row.levelLabel,
      topic: row.topic,
      objective: row.objective,
      materialRefs: splitMaterialRefs(row.materialRef),
      trainer: row.trainer ?? '',
      assessment: row.assessment ?? '',
      rowOrder: String(row.rowOrder),
    })
    setIsFormOpen(true)
  }

  const onSubmit = () => {
    const safeMaterialRefs = Array.isArray(form.materialRefs) ? form.materialRefs : ['']
    const payload = {
      levelLabel: form.levelLabel.trim(),
      topic: form.topic.trim(),
      objective: form.objective.trim(),
      materialRef: safeMaterialRefs.map((x) => x.trim()).filter(Boolean).join('\n') || null,
      trainer: form.trainer.trim() || null,
      assessment: form.assessment.trim() || null,
      rowOrder: form.rowOrder.trim() ? Number.parseInt(form.rowOrder, 10) : null,
    }
    if (editingId) {
      updateItem.mutate(
        { id: editingId, input: payload },
        {
          onSuccess: () => {
            setEditingId(null)
            setForm(EMPTY_FORM)
            setIsFormOpen(false)
          },
        }
      )
      return
    }
    createItem.mutate(payload, {
      onSuccess: () => {
        setForm(EMPTY_FORM)
        setIsFormOpen(false)
      },
    })
  }

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-6">
        <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Quản lý lộ trình học</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>CRUD trực tiếp các objective trong bảng roadmap từ database.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo topic/objective..."
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={levelLabel}
              onChange={(e) => setLevelLabel(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Tất cả lộ trình</option>
              {LEVEL_LABEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Lọc theo topic"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button type="button" className="gap-2 md:justify-self-end" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Thêm bài tập
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : null}
          {!isLoading && grouped.length === 0 ? <p className="text-sm text-muted-foreground">Không có dữ liệu phù hợp.</p> : null}
          {grouped.map(([key, rows]) => {
            const [lvl, topic] = key.split('|||')
            return (
              <div key={key} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold text-primary">{lvl}</p>
                <h3 className="text-base font-bold text-foreground">{topic}</h3>
                <div className="mt-3 space-y-2">
                  {rows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Thứ tự: {row.rowOrder}</p>
                          <p className="text-sm font-medium text-foreground">{row.objective}</p>
                          {row.materialRef ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <p className="font-semibold">Tài liệu / link:</p>
                              <ul className="ml-4 mt-0.5 list-disc space-y-0.5">
                                {splitMaterialRefs(row.materialRef).map((ref, idx) => (
                                  <li key={`${row.id}-ref-${idx}`}>{ref}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {row.trainer ? <p className="text-xs text-muted-foreground">Trainer: {row.trainer}</p> : null}
                          {row.assessment ? (
                            <p className="text-xs text-muted-foreground">Phương thức đánh giá: {row.assessment}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(row.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => deleteItem.mutate(row.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-primary/20 bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">{editingId ? 'Chỉnh sửa bài tập' : 'Thêm bài tập'}</h2>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={form.levelLabel}
                onChange={(e) => setForm((s) => ({ ...s, levelLabel: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {LEVEL_LABEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                value={form.topic}
                onChange={(e) => setForm((s) => ({ ...s, topic: e.target.value }))}
                placeholder="Topic"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <textarea
                value={form.objective}
                onChange={(e) => setForm((s) => ({ ...s, objective: e.target.value }))}
                placeholder="Objective"
                rows={3}
                className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Tài liệu / link</p>
                {(Array.isArray(form.materialRefs) ? form.materialRefs : ['']).map((ref, idx) => (
                  <div key={`material-ref-${idx}`} className="flex gap-2">
                    <input
                      value={ref}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          materialRefs: s.materialRefs.map((x, i) => (i === idx ? e.target.value : x)),
                        }))
                      }
                      placeholder={`Link tài liệu ${idx + 1}`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          materialRefs:
                            s.materialRefs.length <= 1 ? [''] : s.materialRefs.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label={`Xóa link ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setForm((s) => ({ ...s, materialRefs: [...s.materialRefs, ''] }))}
                >
                  <Plus className="h-4 w-4" />
                  Thêm link
                </Button>
              </div>
              <input
                value={form.trainer}
                onChange={(e) => setForm((s) => ({ ...s, trainer: e.target.value }))}
                placeholder="Trainer"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.assessment}
                onChange={(e) => setForm((s) => ({ ...s, assessment: e.target.value }))}
                placeholder="Phương thức đánh giá"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.rowOrder}
                onChange={(e) => setForm((s) => ({ ...s, rowOrder: e.target.value }))}
                placeholder="Thứ tự (rowOrder)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                }}
              >
                Hủy
              </Button>
              <Button type="button" className="gap-2" onClick={onSubmit} disabled={createItem.isPending || updateItem.isPending}>
                <Plus className="h-4 w-4" />
                {editingId ? 'Lưu chỉnh sửa' : 'Thêm bài tập'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
