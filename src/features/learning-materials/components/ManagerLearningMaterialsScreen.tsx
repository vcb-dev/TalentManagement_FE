import { useState } from 'react'
import { BookOpen, Link as LinkIcon, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { ManagerHubPageHeader } from '@/features/manager/components/ManagerHub/ManagerHubPageHeader'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonSubmissionCardList } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import { useEditorClasses } from '@/features/editor-classes/hooks'
import {
  useCreateLearningMaterial,
  useDeleteLearningMaterial,
  useManagerLearningMaterials,
} from '@/features/learning-materials/hooks'
import { learningMaterialsApi } from '@/features/learning-materials/api'

const ALL_CLASSES_VALUE = '__all_editor_classes'

function MaterialFormCard({ onClose }: { onClose: () => void }) {
  const { data: classes = [] } = useEditorClasses()
  const createMaterial = useCreateLearningMaterial()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [classId, setClassId] = useState(ALL_CLASSES_VALUE)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên tài liệu')
      return
    }
    let fileRef: string | null = null
    if (file) {
      setIsUploading(true)
      try {
        const uploaded = await learningMaterialsApi.upload(file)
        fileRef = uploaded.fileUrl
      } catch (err) {
        toast.error(getApiErrorMessage(err))
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }
    if (!url.trim() && !fileRef) {
      toast.error('Cần nhập link hoặc chọn file đính kèm')
      return
    }
    createMaterial.mutate(
      {
        title: title.trim(),
        url: url.trim() || null,
        fileRef,
        note: note.trim() || null,
        classId: classId === ALL_CLASSES_VALUE ? null : classId,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Thêm tài liệu học</h3>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Tên tài liệu <span className="text-danger-500">*</span>
          </label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Áp dụng cho lớp
          </label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES_VALUE}>Tất cả lớp Editor</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Link tài liệu
          </label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Hoặc đính kèm file
          </label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ghi chú</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[60px]"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={createMaterial.isPending || isUploading}
        >
          {isUploading
            ? 'Đang tải file...'
            : createMaterial.isPending
              ? 'Đang lưu...'
              : 'Lưu tài liệu'}
        </Button>
      </div>
    </Card>
  )
}

export function ManagerLearningMaterialsScreen() {
  const {
    data: materials = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useManagerLearningMaterials()
  const deleteMaterial = useDeleteLearningMaterial()
  const [isAdding, setIsAdding] = useState(false)

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-6">
        <ManagerHubPageHeader
          title="Tài liệu học"
          description="Tài liệu chung áp dụng cho mọi lớp Editor, hoặc riêng cho từng lớp."
          actions={
            <Button type="button" className="gap-2" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" />
              Thêm tài liệu
            </Button>
          }
        />

        {isAdding ? <MaterialFormCard onClose={() => setIsAdding(false)} /> : null}

        {isError ? (
          <ErrorState
            title="Không tải được danh sách tài liệu"
            description={getApiErrorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : isLoading ? (
          <SkeletonSubmissionCardList count={3} />
        ) : materials.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="Chưa có tài liệu nào"
            description="Thêm tài liệu học cho lớp Editor."
          />
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <Card key={m.id} className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{m.title}</p>
                    <Badge variant={m.appliesToAllEditorClasses ? 'default' : 'outline'}>
                      {m.appliesToAllEditorClasses ? 'Tất cả lớp' : m.className}
                    </Badge>
                  </div>
                  {m.note ? <p className="mt-1 text-xs text-muted-foreground">{m.note}</p> : null}
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      {m.url}
                    </a>
                  ) : null}
                  {m.fileRef ? (
                    <a
                      href={m.fileRef}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Upload className="h-3 w-3" />
                      File đính kèm
                    </a>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive shrink-0"
                  onClick={() => deleteMaterial.mutate(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ManagerScreenLayout>
  )
}
