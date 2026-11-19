import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { countCourseMaterials, countPathMaterials } from '../courseContent'
import { moveId } from '../courseOrder'
import {
  useCourse,
  useDeleteCourse,
  useDeleteCourseMaterial,
  useDeleteCoursePath,
  useDeleteCourseSection,
  useReorderCourseMaterials,
  useReorderCoursePaths,
  useReorderCourseSections,
  useUpdateCourse,
} from '../hooks'
import type {
  CourseDetail,
  CourseMaterial,
  CoursePath,
  CourseSection,
  MaterialTarget,
} from '../types'
import {
  CourseFormDialog,
  CourseMaterialFormDialog,
  CoursePathFormDialog,
  CourseSectionFormDialog,
} from './CourseFormDialogs'
import { CourseMaterialList } from './CourseMaterialList'
import {
  AddItemButton,
  COURSE_CARD_CLASS,
  CoursePathCard,
  type CoursePathCardActions,
  type MaterialGroupProps,
} from './CoursePathCard'
import { CourseDashboardPill, CourseStatusPill } from './CourseStatusPill'

/** Id DOM của một khoá học trên trang lộ trình — đích cuộn tới khi mở `/courses?courseId=&pathId=`. */
function coursePathAnchorId(pathId: string) {
  return `course-path-${pathId}`
}

// Nhãn: "Course" = lộ trình, "CoursePath" = khoá học, "CourseSection" = học phần (xem `types.ts`).

/** Giữ bản chụp lúc mở dialog — refetch nền không reset form đang gõ. */
type EditState =
  | { kind: 'course'; course: CourseDetail }
  | { kind: 'path'; path: CoursePath | null }
  | { kind: 'section'; pathId: string; section: CourseSection | null }
  | { kind: 'material'; material: CourseMaterial | null; target: MaterialTarget }

type DeleteState =
  | { kind: 'course' }
  | { kind: 'path'; path: CoursePath }
  | { kind: 'section'; section: CourseSection }
  | { kind: 'material'; material: CourseMaterial }

/** Hằng số (không tạo object mới mỗi render) — form tài liệu reset theo tham chiếu `defaultTarget`. */
const ROADMAP_TARGET: MaterialTarget = { pathId: null, sectionId: null }

function deleteCopy(target: DeleteState) {
  if (target.kind === 'course') {
    return {
      title: 'Xoá lộ trình?',
      description:
        'Toàn bộ khoá học, học phần và tài liệu trong lộ trình sẽ bị xoá vĩnh viễn. Nếu chỉ muốn tạm ẩn với nhân sự, dùng nút "Ẩn lộ trình".',
    }
  }
  if (target.kind === 'path') {
    return {
      title: `Xoá khoá học "${target.path.title}"?`,
      description: `${target.path.sections.length} học phần và ${countPathMaterials(target.path)} tài liệu trong khoá học cũng sẽ bị xoá.`,
    }
  }
  if (target.kind === 'section') {
    const n = target.section.materials.length
    return {
      title: `Xoá học phần "${target.section.title}"?`,
      description: n > 0 ? `${n} tài liệu trong học phần cũng sẽ bị xoá.` : undefined,
    }
  }
  return { title: `Xoá tài liệu "${target.material.title}"?`, description: undefined }
}

/** Cùng kiểu nút quay lại của `PageHeader` (`onBack`). */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="mt-0.5 size-10 shrink-0 rounded-md border border-border bg-card hover:bg-muted"
      aria-label="Tất cả lộ trình"
      title="Tất cả lộ trình"
      onClick={onBack}
    >
      <ArrowLeft className="size-4 text-foreground" />
    </Button>
  )
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
        {title}
        {count !== undefined ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  )
}

/**
 * Chi tiết một lộ trình: header gọn (← tên lộ trình, số liệu, nút admin) → các khoá học theo thứ tự
 * (cột chính; mỗi khoá có học phần + tài liệu) + tài liệu chung của lộ trình (cột phụ trên màn rộng).
 * Có `course.manage` thì sửa ngay trên trang — thêm / sửa / xoá / đổi thứ tự ở mọi cấp.
 */
export function CourseDetailView({
  courseId,
  focusPathId,
  canManage,
  onBack,
}: {
  courseId: string
  /** Khoá học cần cuộn tới & làm nổi (đến từ thẻ "Lộ trình đào tạo" ở trang cá nhân). */
  focusPathId?: string
  canManage: boolean
  onBack: () => void
}) {
  const {
    data: course,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCourse(courseId, canManage)
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const deletePath = useDeleteCoursePath()
  const deleteSection = useDeleteCourseSection()
  const deleteMaterial = useDeleteCourseMaterial()
  const reorderPaths = useReorderCoursePaths()
  const reorderSections = useReorderCourseSections()
  const reorderMaterials = useReorderCourseMaterials()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [deleting, setDeleting] = useState<DeleteState | null>(null)

  // Cuộn một lần khi lộ trình vừa tải xong (theo id, không theo từng lần refetch nền).
  const loadedCourseId = course?.id
  useEffect(() => {
    if (!focusPathId || !loadedCourseId) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(coursePathAnchorId(focusPathId))
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [focusPathId, loadedCourseId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <BackButton onBack={onBack} />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-7 w-2/3 max-w-md rounded-lg" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (isError || !course) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <ErrorState
          title="Không tải được lộ trình"
          description={getApiErrorMessage(error) || 'Lộ trình không tồn tại hoặc đã bị ẩn.'}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </div>
    )
  }

  const busy = reorderPaths.isPending || reorderSections.isPending || reorderMaterials.isPending

  const materialGroup: MaterialGroupProps = (group, target) => ({
    canManage,
    busy,
    onMove: (index, delta) => {
      const ids = moveId(
        group.map((m) => m.id),
        index,
        delta
      )
      if (ids) reorderMaterials.mutate({ courseId: course.id, target, ids })
    },
    onEdit: (material) => setEditing({ kind: 'material', material, target }),
    onDelete: (material) => setDeleting({ kind: 'material', material }),
  })

  const pathActions = (path: CoursePath, index: number): CoursePathCardActions => ({
    onMovePath: (delta) => {
      const ids = moveId(
        course.paths.map((p) => p.id),
        index,
        delta
      )
      if (ids) reorderPaths.mutate({ courseId: course.id, ids })
    },
    onEditPath: () => setEditing({ kind: 'path', path }),
    onDeletePath: () => setDeleting({ kind: 'path', path }),
    onAddSection: () => setEditing({ kind: 'section', pathId: path.id, section: null }),
    onMoveSection: (sectionIndex, delta) => {
      const ids = moveId(
        path.sections.map((s) => s.id),
        sectionIndex,
        delta
      )
      if (ids) reorderSections.mutate({ pathId: path.id, ids })
    },
    onEditSection: (section) => setEditing({ kind: 'section', pathId: path.id, section }),
    onDeleteSection: (section) => setDeleting({ kind: 'section', section }),
    onAddMaterial: (target) => setEditing({ kind: 'material', material: null, target }),
    materialGroup,
  })

  const confirmDelete = () => {
    if (!deleting) return
    if (deleting.kind === 'course') deleteCourse.mutate(course.id, { onSuccess: onBack })
    else if (deleting.kind === 'path') deletePath.mutate(deleting.path.id)
    else if (deleting.kind === 'section') deleteSection.mutate(deleting.section.id)
    else deleteMaterial.mutate(deleting.material.id)
    setDeleting(null)
  }

  // Nhân sự không thấy khối trống; admin luôn thấy để thêm nội dung.
  const showPaths = canManage || course.paths.length > 0
  const showShared = canManage || course.materials.length > 0
  const twoColumns = showPaths && showShared

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton onBack={onBack} />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {course.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {canManage ? <CourseStatusPill isActive={course.isActive} /> : null}
              {canManage && course.showOnDashboard ? <CourseDashboardPill /> : null}
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4 shrink-0" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {course.paths.length}
                </span>
                khoá học
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {countCourseMaterials(course)}
                </span>
                tài liệu
              </span>
            </div>
            {course.description ? (
              <p className="mt-2 max-w-3xl whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
                {course.description}
              </p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-[52px] md:pl-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing({ kind: 'course', course })}
            >
              <Pencil className="size-3.5" aria-hidden />
              Sửa thông tin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateCourse.isPending}
              onClick={() =>
                updateCourse.mutate({ id: course.id, input: { isActive: !course.isActive } })
              }
            >
              {course.isActive ? (
                <EyeOff className="size-3.5" aria-hidden />
              ) : (
                <Eye className="size-3.5" aria-hidden />
              )}
              {course.isActive ? 'Ẩn lộ trình' : 'Mở lại lộ trình'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateCourse.isPending}
              title={
                course.showOnDashboard
                  ? 'Gỡ khỏi thẻ "Lộ trình đào tạo" trên trang cá nhân của nhân sự'
                  : 'Hiện lộ trình này ở thẻ "Lộ trình đào tạo" trên trang cá nhân — thay lộ trình đang hiện (nếu có)'
              }
              onClick={() =>
                updateCourse.mutate({
                  id: course.id,
                  input: { showOnDashboard: !course.showOnDashboard },
                })
              }
            >
              {course.showOnDashboard ? (
                <PinOff className="size-3.5" aria-hidden />
              ) : (
                <Pin className="size-3.5" aria-hidden />
              )}
              {course.showOnDashboard ? 'Gỡ khỏi trang cá nhân' : 'Hiện ở trang cá nhân'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-3 text-danger hover:text-danger sm:px-4"
              onClick={() => setDeleting({ kind: 'course' })}
            >
              <Trash2 className="size-3.5" aria-hidden />
              {/* Màn hẹp chỉ hiện icon để 3 nút nằm gọn một hàng. */}
              <span className="sr-only sm:not-sr-only">Xoá lộ trình</span>
            </Button>
          </div>
        ) : null}
      </header>

      {!showPaths && !showShared ? (
        <EmptyState
          icon={<BookOpen className="size-7" />}
          title="Nội dung lộ trình đang được cập nhật"
          description="Các khoá học và tài liệu sẽ hiện ở đây khi được thêm vào lộ trình."
          className={cn(COURSE_CARD_CLASS, 'py-10')}
        />
      ) : (
        <div
          className={cn(
            'grid items-start gap-6',
            twoColumns && 'lg:grid-cols-[minmax(0,1fr)_360px]'
          )}
        >
          {showPaths ? (
            <section className="min-w-0 space-y-3" aria-label="Khoá học trong lộ trình">
              <SectionHeader
                title="Khoá học trong lộ trình"
                count={course.paths.length}
                action={
                  canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing({ kind: 'path', path: null })}
                    >
                      <Plus className="size-4" aria-hidden />
                      Thêm khoá học
                    </Button>
                  ) : null
                }
              />
              {course.paths.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="size-6" />}
                  title="Lộ trình chưa có khoá học"
                  description="Thêm các khoá học theo thứ tự cần học; mỗi khoá chia thành các học phần, học phần có tài liệu riêng."
                  className="rounded-xl border border-dashed border-border py-8"
                />
              ) : (
                <ol>
                  {course.paths.map((path, index) => {
                    const isLast = index === course.paths.length - 1
                    return (
                      <li
                        key={path.id}
                        id={coursePathAnchorId(path.id)}
                        className="flex scroll-mt-24 gap-3"
                      >
                        {/* Mốc lệch xuống 12px cho thẳng hàng với tên khoá; đường nối chạy liền qua khoảng cách giữa các card. */}
                        <div className="flex flex-col items-center" aria-hidden>
                          <span className={cn('h-3 w-px shrink-0', index > 0 && 'bg-border')} />
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-button text-sm font-bold tabular-nums text-button-foreground">
                            {index + 1}
                          </span>
                          {!isLast ? <span className="w-px flex-1 bg-border" /> : null}
                        </div>
                        <CoursePathCard
                          path={path}
                          index={index}
                          count={course.paths.length}
                          canManage={canManage}
                          busy={busy}
                          highlighted={path.id === focusPathId}
                          actions={pathActions(path, index)}
                        />
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          ) : null}

          {showShared ? (
            <section className="min-w-0 space-y-3" aria-label="Tài liệu chung của lộ trình">
              <SectionHeader title="Tài liệu chung của lộ trình" count={course.materials.length} />
              <div className={cn(COURSE_CARD_CLASS, 'px-4 py-2')}>
                <CourseMaterialList
                  materials={course.materials}
                  emptyText="Chưa có tài liệu dùng chung cho cả lộ trình."
                  {...materialGroup(course.materials, ROADMAP_TARGET)}
                />
                {canManage ? (
                  <div className="border-t border-border/60 pt-1">
                    <AddItemButton
                      onClick={() =>
                        setEditing({ kind: 'material', material: null, target: ROADMAP_TARGET })
                      }
                    >
                      Thêm tài liệu chung
                    </AddItemButton>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {canManage ? (
        <>
          <CourseFormDialog
            open={editing?.kind === 'course'}
            onOpenChange={(open) => !open && setEditing(null)}
            course={editing?.kind === 'course' ? editing.course : null}
          />
          <CoursePathFormDialog
            open={editing?.kind === 'path'}
            onOpenChange={(open) => !open && setEditing(null)}
            courseId={course.id}
            path={editing?.kind === 'path' ? editing.path : null}
          />
          <CourseSectionFormDialog
            open={editing?.kind === 'section'}
            onOpenChange={(open) => !open && setEditing(null)}
            pathId={editing?.kind === 'section' ? editing.pathId : ''}
            section={editing?.kind === 'section' ? editing.section : null}
          />
          <CourseMaterialFormDialog
            open={editing?.kind === 'material'}
            onOpenChange={(open) => !open && setEditing(null)}
            course={course}
            material={editing?.kind === 'material' ? editing.material : null}
            defaultTarget={editing?.kind === 'material' ? editing.target : ROADMAP_TARGET}
          />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            {...(deleting ? deleteCopy(deleting) : { title: '' })}
            confirmLabel="Xoá"
            destructive
            onConfirm={confirmDelete}
          />
        </>
      ) : null}
    </div>
  )
}
