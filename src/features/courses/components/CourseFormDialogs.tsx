import { useEffect, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  InputController,
  SelectController,
  TextareaController,
} from '@/components/ui/form-controllers'
import { Label } from '@/components/ui/label'
import { SelectItem } from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/axios'
import { useZodForm } from '@/lib/forms/useZodForm'
import { courseApi } from '../api'
import {
  useCreateCourse,
  useCreateCourseMaterial,
  useCreateCoursePath,
  useUpdateCourse,
  useUpdateCourseMaterial,
  useUpdateCoursePath,
} from '../hooks'
import {
  COURSE_LEVEL_TARGET,
  courseFormSchema,
  courseMaterialFormSchema,
  coursePathFormSchema,
} from '../schemas'
import type { CourseDetail, CourseMaterial, CoursePath, CourseSummary } from '../types'
import { CourseFileField } from './CourseFileField'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Control trong modal (Select, vòng focus) theo màu thương hiệu xanh thay vì tím mặc định — như `FormDialog`. */
// Form là grid item của DialogContent: thiếu `min-w-0` thì tên file / lựa chọn dài kéo form tràn ngang trên mobile.
const FORM_CLASS = 'min-w-0 space-y-4'
const DIALOG_CLASS =
  'max-w-lg [--primary:var(--button)] [--ring:var(--button)] dark:[--primary:158_64%_52%] dark:[--ring:158_64%_52%]'

type CourseFields = Pick<CourseSummary, 'id' | 'title' | 'description'>

function courseValues(course: CourseFields | null | undefined) {
  return { title: course?.title ?? '', description: course?.description ?? '' }
}

function pathValues(path: CoursePath | null | undefined) {
  return { title: path?.title ?? '', description: path?.description ?? '' }
}

function materialValues(material: CourseMaterial | null | undefined, defaultPathId: string | null) {
  return {
    title: material?.title ?? '',
    url: material?.url ?? '',
    note: material?.note ?? '',
    target: (material ? material.pathId : defaultPathId) ?? COURSE_LEVEL_TARGET,
  }
}

/** Sự kiện React vẫn nổi qua portal lên form cha — chặn để không submit form ngoài. */
function stopAndSubmit(submit: (e?: React.BaseSyntheticEvent) => Promise<void>) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.stopPropagation()
    void submit(e)
  }
}

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onCreated,
}: DialogProps & {
  course?: CourseFields | null
  onCreated?: (course: CourseDetail) => void
}) {
  const form = useZodForm({ schema: courseFormSchema, defaultValues: courseValues(course) })
  const { control, handleSubmit, reset } = form
  const create = useCreateCourse()
  const update = useUpdateCourse()

  useEffect(() => {
    if (open) reset(courseValues(course))
  }, [open, course, reset])

  const submit = handleSubmit((values) => {
    const input = { title: values.title, description: values.description || null }
    if (course) {
      update.mutate({ id: course.id, input }, { onSuccess: () => onOpenChange(false) })
      return
    }
    create.mutate(input, {
      onSuccess: (created) => {
        onOpenChange(false)
        onCreated?.(created)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{course ? 'Sửa khoá học' : 'Thêm khoá học'}</DialogTitle>
          <DialogDescription>
            {course
              ? 'Thay đổi hiển thị ngay với nhân sự nếu khoá đang mở.'
              : 'Sau khi tạo, thêm tài liệu chung và các lộ trình học cho khoá.'}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form className={FORM_CLASS} noValidate onSubmit={stopAndSubmit(submit)}>
            <InputController
              control={control}
              name="title"
              label="Tên khoá học"
              required
              autoComplete="off"
              placeholder="VD: Khoá Editor cơ bản"
            />
            <TextareaController
              control={control}
              name="description"
              label="Mô tả"
              rows={4}
              placeholder="Mục tiêu, đối tượng, thời lượng…"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                {course ? 'Lưu' : 'Tạo khoá học'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

export function CoursePathFormDialog({
  open,
  onOpenChange,
  courseId,
  path,
}: DialogProps & { courseId: string; path?: CoursePath | null }) {
  const form = useZodForm({ schema: coursePathFormSchema, defaultValues: pathValues(path) })
  const { control, handleSubmit, reset } = form
  const create = useCreateCoursePath()
  const update = useUpdateCoursePath()

  useEffect(() => {
    if (open) reset(pathValues(path))
  }, [open, path, reset])

  const submit = handleSubmit((values) => {
    const input = { title: values.title, description: values.description || null }
    const done = { onSuccess: () => onOpenChange(false) }
    if (path) update.mutate({ pathId: path.id, input }, done)
    else create.mutate({ courseId, input }, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{path ? 'Sửa lộ trình' : 'Thêm lộ trình'}</DialogTitle>
          <DialogDescription>
            Lộ trình mới được thêm vào cuối — dùng nút mũi tên để đổi thứ tự.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form className={FORM_CLASS} noValidate onSubmit={stopAndSubmit(submit)}>
            <InputController
              control={control}
              name="title"
              label="Tên lộ trình"
              required
              autoComplete="off"
              placeholder="VD: Tuần 1 — Làm quen công cụ"
            />
            <TextareaController
              control={control}
              name="description"
              label="Chi tiết lộ trình"
              rows={5}
              placeholder="Nội dung cần học, yêu cầu đầu ra, thời gian…"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                {path ? 'Lưu' : 'Thêm lộ trình'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

/** Tài liệu cần link và/hoặc file; file tải lên trước khi lưu (giống tài liệu lớp Editor). */
export function CourseMaterialFormDialog({
  open,
  onOpenChange,
  course,
  material,
  defaultPathId,
}: DialogProps & {
  course: CourseDetail
  material?: CourseMaterial | null
  /** Nhóm mặc định khi thêm mới: null = tài liệu chung của khoá. */
  defaultPathId: string | null
}) {
  const form = useZodForm({
    schema: courseMaterialFormSchema,
    defaultValues: materialValues(material, defaultPathId),
  })
  const { control, handleSubmit, reset, setError } = form
  const create = useCreateCourseMaterial()
  const update = useUpdateCourseMaterial()
  const [file, setFile] = useState<File | null>(null)
  const [keepFile, setKeepFile] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    reset(materialValues(material, defaultPathId))
    setFile(null)
    setKeepFile(true)
  }, [open, material, defaultPathId, reset])

  const existingFile = keepFile && material?.fileRef ? material : null

  const submit = handleSubmit(async (values) => {
    if (!values.url && !file && !existingFile) {
      setError('url', { message: 'Cần nhập link hoặc đính kèm file' })
      return
    }
    let fileRef = existingFile?.fileRef ?? null
    let fileName = existingFile?.fileName ?? null
    if (file) {
      setUploading(true)
      try {
        const uploaded = await courseApi.upload(file)
        fileRef = uploaded.fileUrl
        fileName = uploaded.fileName
      } catch (e) {
        toast.error(getApiErrorMessage(e) || 'Không tải được file lên')
        return
      } finally {
        setUploading(false)
      }
    }
    const input = {
      title: values.title,
      url: values.url || null,
      fileRef,
      fileName,
      note: values.note || null,
      pathId: values.target === COURSE_LEVEL_TARGET ? null : values.target,
    }
    const done = { onSuccess: () => onOpenChange(false) }
    if (material) update.mutate({ materialId: material.id, input }, done)
    else create.mutate({ courseId: course.id, input }, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{material ? 'Sửa tài liệu' : 'Thêm tài liệu'}</DialogTitle>
          <DialogDescription>
            Nhập link (Google Drive, YouTube…) hoặc đính kèm file.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form className={FORM_CLASS} noValidate onSubmit={stopAndSubmit(submit)}>
            <InputController
              control={control}
              name="title"
              label="Tên tài liệu"
              required
              autoComplete="off"
            />
            {course.paths.length > 0 ? (
              <SelectController control={control} name="target" label="Thuộc">
                <SelectItem value={COURSE_LEVEL_TARGET}>Tài liệu chung của khoá</SelectItem>
                {course.paths.map((p, i) => (
                  <SelectItem key={p.id} value={p.id}>
                    Lộ trình {i + 1}: {p.title}
                  </SelectItem>
                ))}
              </SelectController>
            ) : null}
            <InputController
              control={control}
              name="url"
              label="Link tài liệu"
              autoComplete="off"
              placeholder="https://…"
            />
            <div className="space-y-2">
              <Label htmlFor="course-material-file" className="text-xs font-semibold">
                Hoặc đính kèm file
              </Label>
              <CourseFileField
                id="course-material-file"
                file={file}
                existingFileName={existingFile ? existingFile.fileName : undefined}
                disabled={uploading}
                onPick={setFile}
                // Bỏ file vừa chọn thì quay về file cũ (nếu có); bấm lần nữa mới bỏ file cũ.
                onClear={() => (file ? setFile(null) : setKeepFile(false))}
              />
            </div>
            <TextareaController control={control} name="note" label="Ghi chú" rows={3} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={uploading || create.isPending || update.isPending}>
                {uploading ? 'Đang tải file…' : material ? 'Lưu' : 'Thêm tài liệu'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
