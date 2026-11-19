import { useEffect, useState } from 'react'
import { FormProvider, type UseFormReturn } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/axios'
import { useZodForm } from '@/lib/forms/useZodForm'
import { courseApi } from '../api'
import { decodeMaterialTarget, encodeMaterialTarget } from '../courseContent'
import {
  useCreateCourse,
  useCreateCourseMaterial,
  useCreateCoursePath,
  useCreateCourseSection,
  useCourses,
  useUpdateCourse,
  useUpdateCourseMaterial,
  useUpdateCoursePath,
  useUpdateCourseSection,
} from '../hooks'
import {
  type CourseForm,
  courseFormSchema,
  courseMaterialFormSchema,
  coursePathFormSchema,
  courseSectionFormSchema,
} from '../schemas'
import type {
  CourseDetail,
  CourseMaterial,
  CoursePath,
  CourseSection,
  CourseSummary,
  MaterialTarget,
} from '../types'
import { CourseFileField } from './CourseFileField'

// Nhãn: "Course" = lộ trình, "CoursePath" = khoá học, "CourseSection" = học phần (xem `types.ts`).

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Control trong modal (Select, vòng focus) theo màu thương hiệu xanh thay vì tím mặc định — như `FormDialog`. */
// Form là grid item của DialogContent: thiếu `min-w-0` thì tên file / lựa chọn dài kéo form tràn ngang trên mobile.
const FORM_CLASS = 'min-w-0 space-y-4'
const DIALOG_CLASS =
  'max-w-lg [--primary:var(--button)] [--ring:var(--button)] dark:[--primary:158_64%_52%] dark:[--ring:158_64%_52%]'
/** Radix bỏ qua `className` của SelectValue — cắt "…" tên khoá/học phần dài từ trigger. */
const TARGET_TRIGGER_CLASS = '[&>span]:min-w-0 [&>span]:truncate'
/** Radix Select không nhận value rỗng — giá trị "khoá học không theo lộ trình nào". */
const NO_LINKED_COURSE = '__none'

type TitleFields = { title: string; description: string | null }

function titleValues(item: TitleFields | null | undefined) {
  return { title: item?.title ?? '', description: item?.description ?? '' }
}

function materialValues(material: CourseMaterial | null | undefined, target: MaterialTarget) {
  return {
    title: material?.title ?? '',
    url: material?.url ?? '',
    note: material?.note ?? '',
    target: encodeMaterialTarget(material ?? target),
  }
}

/** Sự kiện React vẫn nổi qua portal lên form cha — chặn để không submit form ngoài. */
function stopAndSubmit(submit: (e?: React.BaseSyntheticEvent) => Promise<void>) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.stopPropagation()
    void submit(e)
  }
}

/** Form tên + mô tả dùng chung cho lộ trình / khoá học / học phần (3 schema cùng dạng `CourseForm`). */
function TitleDescriptionDialog({
  open,
  onOpenChange,
  form,
  title,
  description,
  titleLabel,
  titlePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  descriptionRows,
  submitLabel,
  pending,
  onSubmit,
  children,
}: DialogProps & {
  form: UseFormReturn<CourseForm>
  title: string
  description: string
  titleLabel: string
  titlePlaceholder: string
  descriptionLabel: string
  descriptionPlaceholder: string
  descriptionRows: number
  submitLabel: string
  pending: boolean
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
  /** Trường riêng của từng loại (VD lộ trình liên kết của khoá học), đặt dưới ô mô tả. */
  children?: React.ReactNode
}) {
  const { control } = form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form className={FORM_CLASS} noValidate onSubmit={stopAndSubmit(onSubmit)}>
            <InputController
              control={control}
              name="title"
              label={titleLabel}
              required
              autoComplete="off"
              placeholder={titlePlaceholder}
            />
            <TextareaController
              control={control}
              name="description"
              label={descriptionLabel}
              rows={descriptionRows}
              placeholder={descriptionPlaceholder}
            />
            {children}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={pending}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

/** Thêm / sửa lộ trình (`Course`). */
export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onCreated,
}: DialogProps & {
  course?: Pick<CourseSummary, 'id' | 'title' | 'description'> | null
  onCreated?: (course: CourseDetail) => void
}) {
  const form = useZodForm({ schema: courseFormSchema, defaultValues: titleValues(course) })
  const { handleSubmit, reset } = form
  const create = useCreateCourse()
  const update = useUpdateCourse()

  useEffect(() => {
    if (open) reset(titleValues(course))
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
    <TitleDescriptionDialog
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      title={course ? 'Sửa lộ trình' : 'Thêm lộ trình'}
      description={
        course
          ? 'Thay đổi hiển thị ngay với nhân sự nếu lộ trình đang mở.'
          : 'Sau khi tạo, thêm các khoá học (theo thứ tự) và tài liệu chung cho lộ trình.'
      }
      titleLabel="Tên lộ trình"
      titlePlaceholder="VD: Đào tạo hội nhập"
      descriptionLabel="Mô tả"
      descriptionPlaceholder="Mục tiêu, đối tượng, thời lượng…"
      descriptionRows={4}
      submitLabel={course ? 'Lưu' : 'Tạo lộ trình'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
    />
  )
}

/** Thêm / sửa khoá học trong lộ trình (`CoursePath`). */
export function CoursePathFormDialog({
  open,
  onOpenChange,
  courseId,
  path,
}: DialogProps & { courseId: string; path?: CoursePath | null }) {
  const form = useZodForm({ schema: coursePathFormSchema, defaultValues: titleValues(path) })
  const { handleSubmit, reset } = form
  const create = useCreateCoursePath()
  const update = useUpdateCoursePath()
  // Dialog chỉ dựng cho admin (`course.manage`) — dùng chung cache danh sách lộ trình của trang quản trị.
  const { data: courses } = useCourses(true)
  const linkOptions = (courses ?? []).filter((c) => c.id !== courseId)
  // null = chưa chọn lại trong lần mở này → lấy theo khoá đang sửa; đóng dialog thì xoá lựa chọn.
  const [linkedChoice, setLinkedChoice] = useState<string | null>(null)
  const linkedCourseId = linkedChoice ?? path?.linkedCourse?.id ?? NO_LINKED_COURSE
  const handleOpenChange = (next: boolean) => {
    if (!next) setLinkedChoice(null)
    onOpenChange(next)
  }

  useEffect(() => {
    if (open) reset(titleValues(path))
  }, [open, path, reset])

  const submit = handleSubmit((values) => {
    const input = {
      title: values.title,
      description: values.description || null,
      linkedCourseId: linkedCourseId === NO_LINKED_COURSE ? null : linkedCourseId,
    }
    const done = { onSuccess: () => handleOpenChange(false) }
    if (path) update.mutate({ pathId: path.id, input }, done)
    else create.mutate({ courseId, input }, done)
  })

  return (
    <TitleDescriptionDialog
      open={open}
      onOpenChange={handleOpenChange}
      form={form}
      title={path ? 'Sửa khoá học' : 'Thêm khoá học'}
      description="Khoá học mới được thêm vào cuối lộ trình — dùng nút mũi tên để đổi thứ tự."
      titleLabel="Tên khoá học"
      titlePlaceholder="VD: Tuần 1 — Làm quen công cụ"
      descriptionLabel="Mô tả khoá học"
      descriptionPlaceholder="Mục tiêu, yêu cầu đầu ra, thời gian…"
      descriptionRows={4}
      submitLabel={path ? 'Lưu' : 'Thêm khoá học'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <div className="space-y-2">
        {/* Cùng cỡ chữ nhãn của `FormLabel` (các ô tên / mô tả phía trên). */}
        <Label htmlFor="course-path-linked-course" className="text-xs font-semibold">
          Hiển thị theo lộ trình
        </Label>
        <Select value={linkedCourseId} onValueChange={setLinkedChoice}>
          <SelectTrigger id="course-path-linked-course" className={TARGET_TRIGGER_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LINKED_COURSE}>Không — khoá học riêng</SelectItem>
            {linkOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
                {c.isActive ? '' : ' (đang ẩn)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Chọn một lộ trình khác thì khoá học này hiện các khoá của lộ trình đó — VD "Lao động tri
          thức" theo "Lộ trình 5 cấp độ Lao động tri thức".
        </p>
      </div>
    </TitleDescriptionDialog>
  )
}

/** Thêm / sửa học phần trong khoá học (`CourseSection`). */
export function CourseSectionFormDialog({
  open,
  onOpenChange,
  pathId,
  section,
}: DialogProps & { pathId: string; section?: CourseSection | null }) {
  const form = useZodForm({ schema: courseSectionFormSchema, defaultValues: titleValues(section) })
  const { handleSubmit, reset } = form
  const create = useCreateCourseSection()
  const update = useUpdateCourseSection()

  useEffect(() => {
    if (open) reset(titleValues(section))
  }, [open, section, reset])

  const submit = handleSubmit((values) => {
    const input = { title: values.title, description: values.description || null }
    const done = { onSuccess: () => onOpenChange(false) }
    if (section) update.mutate({ sectionId: section.id, input }, done)
    else create.mutate({ pathId, input }, done)
  })

  return (
    <TitleDescriptionDialog
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      title={section ? 'Sửa học phần' : 'Thêm học phần'}
      description="Học phần mới được thêm vào cuối khoá học — mỗi học phần có tài liệu riêng."
      titleLabel="Tên học phần"
      titlePlaceholder="VD: Quy trình làm việc 4Q"
      descriptionLabel="Nội dung học phần"
      descriptionPlaceholder="Nội dung cần nắm, bài tập, thời gian…"
      descriptionRows={4}
      submitLabel={section ? 'Lưu' : 'Thêm học phần'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
    />
  )
}

/** Tài liệu cần link và/hoặc file; file tải lên trước khi lưu (giống tài liệu lớp Editor). */
export function CourseMaterialFormDialog({
  open,
  onOpenChange,
  course,
  material,
  defaultTarget,
}: DialogProps & {
  course: CourseDetail
  material?: CourseMaterial | null
  /** Nhóm mặc định khi thêm mới (lộ trình / khoá học / học phần). */
  defaultTarget: MaterialTarget
}) {
  const form = useZodForm({
    schema: courseMaterialFormSchema,
    defaultValues: materialValues(material, defaultTarget),
  })
  const { control, handleSubmit, reset, setError } = form
  const create = useCreateCourseMaterial()
  const update = useUpdateCourseMaterial()
  const [file, setFile] = useState<File | null>(null)
  const [keepFile, setKeepFile] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    reset(materialValues(material, defaultTarget))
    setFile(null)
    setKeepFile(true)
  }, [open, material, defaultTarget, reset])

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
      ...decodeMaterialTarget(values.target),
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
              <SelectController
                control={control}
                name="target"
                label="Thuộc"
                triggerClassName={TARGET_TRIGGER_CLASS}
              >
                <SelectItem value={encodeMaterialTarget({ pathId: null, sectionId: null })}>
                  Tài liệu chung của lộ trình
                </SelectItem>
                {course.paths.map((p, i) => (
                  <SelectGroup key={p.id}>
                    <SelectLabel className="mt-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      Khoá {i + 1}: {p.title}
                    </SelectLabel>
                    <SelectItem value={encodeMaterialTarget({ pathId: p.id, sectionId: null })}>
                      Khoá {i + 1} — tài liệu chung
                    </SelectItem>
                    {p.sections.map((s, j) => (
                      <SelectItem
                        key={s.id}
                        value={encodeMaterialTarget({ pathId: p.id, sectionId: s.id })}
                      >
                        Học phần {i + 1}.{j + 1}: {s.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
