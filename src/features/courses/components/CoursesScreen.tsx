import { useState } from 'react'
import { BookOpen, ChevronRight, Ellipsis, Eye, EyeOff, FileText, Plus, Route } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { moveId } from '../courseOrder'
import { useCourses, useDeleteCourse, useReorderCourses, useUpdateCourse } from '../hooks'
import type { CourseSummary } from '../types'
import { CourseDetailView } from './CourseDetailView'
import { CourseFormDialog } from './CourseFormDialogs'
import { CourseItemActions } from './CourseItemActions'
import { CourseDashboardPill, CourseStatusPill } from './CourseStatusPill'

/** Xem trước các khoá học đầu của lộ trình dạng mốc đánh số — cùng kiểu với trang chi tiết lộ trình. */
function CoursePathPreview({ course }: { course: CourseSummary }) {
  if (course.pathCount === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0" aria-hidden />
        {course.materialCount > 0
          ? 'Chưa có khoá học — chỉ có tài liệu chung'
          : 'Nội dung lộ trình đang được cập nhật'}
      </p>
    )
  }
  const more = course.pathCount - course.pathPreview.length
  const steps = course.pathPreview.length + (more > 0 ? 1 : 0)
  // Đoạn nối giữa 2 mốc: mốc cao 20px (size-5), cách nhau 8px (space-y-2).
  const connector = (i: number) =>
    i < steps - 1
      ? 'before:absolute before:left-[9.5px] before:top-5 before:h-2 before:w-px before:bg-border'
      : undefined

  return (
    <ol className="space-y-2" aria-label="Các khoá học trong lộ trình">
      {course.pathPreview.map((p, i) => (
        <li key={p.id} className={cn('relative flex items-center gap-2.5 text-sm', connector(i))}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-button/10 text-[11px] font-bold tabular-nums text-button">
            {i + 1}
          </span>
          <span className="min-w-0 truncate text-foreground/85" title={p.title}>
            {p.title}
          </span>
        </li>
      ))}
      {more > 0 ? (
        <li className="relative flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
            <Ellipsis className="size-3" aria-hidden />
          </span>
          +{more} khoá học nữa
        </li>
      ) : null}
    </ol>
  )
}

function CourseCard({
  course,
  index,
  count,
  canManage,
  busy,
  onOpen,
  onMove,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  course: CourseSummary
  index: number
  count: number
  canManage: boolean
  busy: boolean
  onOpen: () => void
  onMove: (delta: -1 | 1) => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    // Tiêu đề là nút mở lộ trình, `after:` phủ cả card (stretched link) — thanh admin nằm trên lớp phủ (z-10).
    <li
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-200 hover:border-button/30 hover:shadow-[0_8px_24px_-12px_rgb(15_23_42/0.18)]',
        course.isActive ? 'border-border/80' : 'border-dashed border-border bg-muted/20'
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <CourseStatusPill isActive={course.isActive} />
            {course.showOnDashboard ? <CourseDashboardPill /> : null}
          </div>
        ) : null}

        <div className="min-w-0 space-y-1.5">
          <h3 className="text-base font-bold leading-snug text-foreground">
            <button
              type="button"
              onClick={onOpen}
              title={course.title}
              className="block w-full text-left transition-colors after:absolute after:inset-0 after:rounded-2xl group-hover:text-button focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-button focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
            >
              <span className="line-clamp-2 break-words">{course.title}</span>
            </button>
          </h3>
          {course.description ? (
            <p className="line-clamp-2 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          ) : null}
        </div>

        <CoursePathPreview course={course} />

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5 shrink-0" aria-hidden />
              <span className="font-semibold tabular-nums text-foreground">{course.pathCount}</span>
              khoá học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span className="font-semibold tabular-nums text-foreground">
                {course.materialCount}
              </span>
              tài liệu
            </span>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-button"
            aria-hidden
          >
            Xem
            <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
      {canManage ? (
        <div className="relative z-10 flex items-center justify-between gap-1 rounded-b-2xl border-t border-border/70 bg-muted/30 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={onToggleActive}
          >
            {course.isActive ? (
              <EyeOff className="size-3.5" aria-hidden />
            ) : (
              <Eye className="size-3.5" aria-hidden />
            )}
            {course.isActive ? 'Ẩn' : 'Mở lại'}
          </Button>
          <CourseItemActions
            index={index}
            count={count}
            disabled={busy}
            itemLabel="lộ trình"
            onMove={onMove}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </li>
  )
}

function CourseList({
  canManage,
  onOpen,
  onCreate,
}: {
  canManage: boolean
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCourses(canManage)
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const reorder = useReorderCourses()
  const [editing, setEditing] = useState<CourseSummary | null>(null)
  const [deleting, setDeleting] = useState<CourseSummary | null>(null)

  if (isError) {
    return (
      <ErrorState
        title="Không tải được danh sách lộ trình"
        description={getApiErrorMessage(error)}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<Route className="size-7" />}
        title="Chưa có lộ trình nào"
        description={
          canManage
            ? 'Tạo lộ trình đầu tiên, sau đó thêm các khoá học (theo thứ tự) và học phần cho từng khoá.'
            : 'Lộ trình đào tạo sẽ hiện ở đây khi được mở.'
        }
        action={
          canManage ? (
            <Button type="button" onClick={onCreate}>
              <Plus className="size-4" aria-hidden />
              Thêm lộ trình
            </Button>
          ) : null
        }
        className="rounded-2xl border border-dashed border-border"
      />
    )
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={course}
            index={index}
            count={courses.length}
            canManage={canManage}
            busy={reorder.isPending}
            onOpen={() => onOpen(course.id)}
            onMove={(delta) => {
              const ids = moveId(
                courses.map((c) => c.id),
                index,
                delta
              )
              if (ids) reorder.mutate(ids)
            }}
            onEdit={() => setEditing(course)}
            onToggleActive={() =>
              updateCourse.mutate({ id: course.id, input: { isActive: !course.isActive } })
            }
            onDelete={() => setDeleting(course)}
          />
        ))}
      </ul>
      {canManage ? (
        <>
          <CourseFormDialog
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            course={editing}
          />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={`Xoá lộ trình "${deleting?.title ?? ''}"?`}
            description={`${deleting?.pathCount ?? 0} khoá học (kèm học phần) và ${deleting?.materialCount ?? 0} tài liệu trong lộ trình sẽ bị xoá vĩnh viễn. Nếu chỉ muốn tạm ẩn với nhân sự, dùng nút "Ẩn".`}
            confirmLabel="Xoá"
            destructive
            onConfirm={() => {
              if (deleting) deleteCourse.mutate(deleting.id)
              setDeleting(null)
            }}
          />
        </>
      ) : null}
    </>
  )
}

/**
 * Trang "Lộ trình đào tạo" (tách khỏi lộ trình cấp/sao ở `/learning-path`): lộ trình → khoá học → học phần.
 * Mọi nhân sự xem lộ trình đang mở; có `course.manage` thì cấu hình ngay trên trang.
 */
export function CoursesScreen({
  courseId,
  focusPathId,
  onOpenCourse,
}: {
  courseId: string | undefined
  /** Khoá học cần cuộn tới & làm nổi trong lộ trình `courseId`. */
  focusPathId?: string
  onOpenCourse: (courseId: string | undefined) => void
}) {
  const { canId } = usePermission()
  const canManage = canId('course.manage')
  const [creating, setCreating] = useState(false)

  return (
    <>
      {/* Trang chi tiết tự dựng header (tên lộ trình + nút quay lại) — không chồng thêm tiêu đề chung. */}
      {courseId ? null : (
        <PageHeader
          title="Lộ trình đào tạo"
          description={
            canManage
              ? 'Thêm lộ trình, xếp các khoá học theo thứ tự, chia học phần và gắn tài liệu — lộ trình đang ẩn chỉ người cấu hình thấy.'
              : 'Chọn lộ trình để xem các khoá học, học phần và tài liệu học.'
          }
          actions={
            canManage ? (
              <Button type="button" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden />
                Thêm lộ trình
              </Button>
            ) : null
          }
        />
      )}
      <div className="pb-8">
        {courseId ? (
          <CourseDetailView
            courseId={courseId}
            focusPathId={focusPathId}
            canManage={canManage}
            onBack={() => onOpenCourse(undefined)}
          />
        ) : (
          <CourseList
            canManage={canManage}
            onOpen={onOpenCourse}
            onCreate={() => setCreating(true)}
          />
        )}
      </div>
      {canManage ? (
        <CourseFormDialog
          open={creating}
          onOpenChange={setCreating}
          onCreated={(course) => onOpenCourse(course.id)}
        />
      ) : null}
    </>
  )
}
