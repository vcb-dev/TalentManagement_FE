import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'
import {
  InputController,
  InputFieldController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useCreateManagerRoadmapItem,
  useDeleteManagerRoadmapItem,
  useManagerRoadmapItems,
  useUpdateManagerRoadmapItem,
} from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const LEVEL_LABEL_OPTIONS = ['Tập sự -> Biết việc', 'Biết việc -> Được việc']

type MaterialRefRow = { value: string }

type FormState = {
  levelLabel: string
  topic: string
  objective: string
  materialRefs: MaterialRefRow[]
  trainer: string
  assessment: string
  rowOrder: string
}

const EMPTY_FORM: FormState = {
  levelLabel: LEVEL_LABEL_OPTIONS[0]!,
  topic: '',
  objective: '',
  materialRefs: [{ value: '' }],
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
  const form = useForm<FormState>({ defaultValues: EMPTY_FORM, mode: 'onChange' })
  const { control, handleSubmit, reset } = form
  const {
    fields: materialRefFields,
    append: appendMaterialRef,
    remove: removeMaterialRef,
  } = useFieldArray({
    control,
    name: 'materialRefs',
  })

  const { data: items = [], isLoading } = useManagerRoadmapItems({
    q,
    levelLabel,
    topic: topicFilter,
  })
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
    reset({ ...EMPTY_FORM, levelLabel: levelLabel || EMPTY_FORM.levelLabel })
    setIsFormOpen(true)
  }

  const startEdit = (id: string) => {
    const row = items.find((x) => x.id === id)
    if (!row) return
    setEditingId(id)
    reset({
      levelLabel: row.levelLabel,
      topic: row.topic,
      objective: row.objective,
      materialRefs: splitMaterialRefs(row.materialRef).map((value) => ({ value })),
      trainer: row.trainer ?? '',
      assessment: row.assessment ?? '',
      rowOrder: String(row.rowOrder),
    })
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingId(null)
    reset(EMPTY_FORM)
  }

  const onSubmit = handleSubmit((values) => {
    const safeMaterialRefs = Array.isArray(values.materialRefs)
      ? values.materialRefs
      : EMPTY_FORM.materialRefs
    const payload = {
      levelLabel: values.levelLabel.trim(),
      topic: values.topic.trim(),
      objective: values.objective.trim(),
      materialRef:
        safeMaterialRefs
          .map((x) => x.value.trim())
          .filter(Boolean)
          .join('\n') || null,
      trainer: values.trainer.trim() || null,
      assessment: values.assessment.trim() || null,
      rowOrder: values.rowOrder.trim() ? Number.parseInt(values.rowOrder, 10) : null,
    }
    if (editingId) {
      updateItem.mutate(
        { id: editingId, input: payload },
        {
          onSuccess: () => {
            closeFormModal()
          },
        }
      )
      return
    }
    createItem.mutate(payload, {
      onSuccess: () => {
        closeFormModal()
      },
    })
  })

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-6">
        <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
          <h1 className={PAGE_HEADER_TITLE}>
            <span className={PAGE_HEADER_GRADIENT}>Quản lý lộ trình học</span>
          </h1>
          <p className={PAGE_HEADER_DESCRIPTION}>
            CRUD trực tiếp các objective trong bảng roadmap từ database.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo topic/objective..."
              className="rounded-lg text-sm focus-visible:border-primary"
            />
            <Select
              value={levelLabel || '__all'}
              onValueChange={(v) => setLevelLabel(v === '__all' ? '' : v)}
            >
              <SelectTrigger className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Tất cả lộ trình</SelectItem>
                {LEVEL_LABEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Lọc theo topic"
              className="rounded-lg text-sm focus-visible:border-primary"
            />
            <Button type="button" className="gap-2 md:justify-self-end" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Thêm bài tập
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : null}
          {!isLoading && grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có dữ liệu phù hợp.</p>
          ) : null}
          {grouped.map(([key, rows]) => {
            const [lvl, topic] = key.split('|||')
            return (
              <div key={key} className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold text-primary">{lvl}</p>
                <h3 className="text-base font-bold text-foreground">{topic}</h3>
                <div className="mt-3 space-y-2">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border-2 border-border/80 bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
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
                          {row.trainer ? (
                            <p className="text-xs text-muted-foreground">Trainer: {row.trainer}</p>
                          ) : null}
                          {row.assessment ? (
                            <p className="text-xs text-muted-foreground">
                              Phương thức đánh giá: {row.assessment}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(row.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteItem.mutate(row.id)}
                          >
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
              <h2 className="text-sm font-bold text-foreground">
                {editingId ? 'Chỉnh sửa bài tập' : 'Thêm bài tập'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-muted-foreground"
                onClick={closeFormModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Form {...form}>
              <form className="grid grid-cols-1 gap-2 md:grid-cols-2" onSubmit={onSubmit}>
                <SelectController
                  control={control}
                  name="levelLabel"
                  label="Lộ trình"
                  required
                  rules={{ required: true }}
                >
                  {LEVEL_LABEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectController>
                <InputController
                  control={control}
                  name="topic"
                  label="Topic"
                  required
                  rules={{ required: true, minLength: 2 }}
                  placeholder="Topic"
                />
                <TextareaController
                  control={control}
                  name="objective"
                  label="Objective"
                  required
                  rules={{ required: true, minLength: 2 }}
                  className="md:col-span-2"
                  textareaClassName="min-h-[100px]"
                  placeholder="Objective"
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Tài liệu / link</p>
                  {materialRefFields.map((refField, idx) => (
                    <div key={refField.id} className="flex gap-2">
                      <InputFieldController
                        control={control}
                        name={`materialRefs.${idx}.value`}
                        placeholder={`Link tài liệu ${idx + 1}`}
                        className="min-w-0 flex-1"
                        inputClassName="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (materialRefFields.length <= 1) return
                          removeMaterialRef(idx)
                        }}
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
                    onClick={() => appendMaterialRef({ value: '' })}
                  >
                    <Plus className="h-4 w-4" />
                    Thêm link
                  </Button>
                </div>
                <InputController
                  control={control}
                  name="trainer"
                  label="Trainer"
                  placeholder="Trainer"
                />
                <InputController
                  control={control}
                  name="assessment"
                  label="Phương thức đánh giá"
                  placeholder="Phương thức đánh giá"
                />
                <InputController
                  control={control}
                  name="rowOrder"
                  label="Thứ tự (rowOrder)"
                  placeholder="Thứ tự (rowOrder)"
                  inputMode="numeric"
                />
                <div className="mt-3 flex justify-end gap-2 md:col-span-2">
                  <Button type="button" variant="outline" onClick={closeFormModal}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={createItem.isPending || updateItem.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    {editingId ? 'Lưu chỉnh sửa' : 'Thêm bài tập'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      ) : null}
    </ManagerScreenLayout>
  )
}
