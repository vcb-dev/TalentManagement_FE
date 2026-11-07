import { useState, type ReactNode } from 'react'
import { ArrowLeft, Eye, EyeOff, FileText, Pencil, Plus, Route, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { moveId } from '../courseOrder'
import {
  useCourse,
  useDeleteCourse,
  useDeleteCourseMaterial,
  useDeleteCoursePath,
  useReorderCourseMaterials,
  useReorderCoursePaths,
  useUpdateCourse,
} from '../hooks'
import type { CourseDetail, CourseMaterial, CoursePath } from '../types'
import {
  CourseFormDialog,
  CourseMaterialFormDialog,
  CoursePathFormDialog,
} from './CourseFormDialogs'
import { CourseItemActions } from './CourseItemActions'
import { CourseMaterialList } from './CourseMaterialList'
import { CourseStatusPill } from './CourseStatusPill'

/** Giữ bản chụp lúc mở dialog — refetch nền không reset form đang gõ. */
type EditState =
  | { kind: 'course'; course: CourseDetail }
  | { kind: 'path'; path: CoursePath | null }
  | { kind: 'material'; material: CourseMaterial | null; pathId: string | null }

type DeleteState =
  | { kind: 'course' }
  | { kind: 'path'; path: CoursePath }
  | { kind: 'material'; material: CourseMaterial }

const CARD = 'rounded-xl border border-border/80 bg-card shadow-[var(--shadow-card)]'

function countMaterials(course: CourseDetail) {
  return course.materials.length + course.paths.reduce((n, p) => n + p.materials.length, 0)
}

function deleteCopy(target: DeleteState) {
  if (target.kind === 'course') {
    return {
      title: 'Xoá khoá học?',
      description:
        'Toàn bộ lộ trình và tài liệu trong khoá sẽ bị xoá vĩnh viễn. Nếu chỉ muốn tạm ẩn với nhân sự, dùng nút "Ẩn khoá".',
    }
  }
  if (target.kind === 'path') {
    return {
      title: `Xoá lộ trình "${target.path.title}"?`,
      description: `${target.path.materials.length} tài liệu trong lộ trình cũng sẽ bị xoá.`,
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
      aria-label="Tất cả khoá học"
      title="Tất cả khoá học"
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

function AddMaterialButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 rounded-lg px-2 text-button hover:text-button"
      onClick={onClick}
    >
      <Plus className="size-3.5" aria-hidden />
      {label}
    </Button>
  )
}

/**
 * Chi tiết khoá: header gọn (← tên khoá, số liệu, nút admin) → lộ trình (cột chính) + tài liệu chung
 * (cột phụ trên màn rộng). Có `course.manage` thì sửa ngay trên trang — thêm / sửa / xoá / đổi thứ tự.
 */
export function CourseDetailView({
  courseId,
  canManage,
  onBack,
}: {
  courseId: string
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
  const deleteMaterial = useDeleteCourseMaterial()
  const reorderPaths = useReorderCoursePaths()
  const reorderMaterials = useReorderCourseMaterials()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [deleting, setDeleting] = useState<DeleteState | null>(null)

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
          title="Không tải được khoá học"
          description={getApiErrorMessage(error) || 'Khoá học không tồn tại hoặc đã bị ẩn.'}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </div>
    )
  }

  const busy = reorderPaths.isPending || reorderMaterials.isPending

  const moveMaterial =
    (group: CourseMaterial[], pathId: string | null) => (index: number, delta: -1 | 1) => {
      const ids = moveId(
        group.map((m) => m.id),
        index,
        delta
      )
      if (ids) reorderMaterials.mutate({ courseId: course.id, pathId, ids })
    }

  const materialHandlers = (group: CourseMaterial[], pathId: string | null) => ({
    canManage,
    busy,
    onMove: moveMaterial(group, pathId),
    onEdit: (material: CourseMaterial) => setEditing({ kind: 'material', material, pathId }),
    onDelete: (material: CourseMaterial) => setDeleting({ kind: 'material', material }),
  })

  const confirmDelete = () => {
    if (!deleting) return
    if (deleting.kind === 'course') deleteCourse.mutate(course.id, { onSuccess: onBack })
    else if (deleting.kind === 'path') deletePath.mutate(deleting.path.id)
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
              <span className="inline-flex items-center gap-1.5">
                <Route className="size-4 shrink-0" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {course.paths.length}
                </span>
                lộ trình
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {countMaterials(course)}
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
              {course.isActive ? 'Ẩn khoá' : 'Mở lại khoá'}
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
              <span className="sr-only sm:not-sr-only">Xoá khoá</span>
            </Button>
          </div>
        ) : null}
      </header>

      {!showPaths && !showShared ? (
        <EmptyState
          icon={<Route className="size-7" />}
          title="Nội dung khoá đang được cập nhật"
          description="Lộ trình và tài liệu sẽ hiện ở đây khi được thêm vào khoá."
          className={cn(CARD, 'py-10')}
        />
      ) : (
        <div
          className={cn(
            'grid items-start gap-6',
            twoColumns && 'lg:grid-cols-[minmax(0,1fr)_360px]'
          )}
        >
          {showPaths ? (
            <section className="min-w-0 space-y-3" aria-label="Lộ trình học">
              <SectionHeader
                title="Lộ trình học"
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
                      Thêm lộ trình
                    </Button>
                  ) : null
                }
              />
              {course.paths.length === 0 ? (
                <EmptyState
                  icon={<Route className="size-6" />}
                  title="Khoá học chưa có lộ trình"
                  description="Chia khoá thành các lộ trình (giai đoạn / tuần / chủ đề), mỗi lộ trình có tài liệu riêng."
                  className="rounded-xl border border-dashed border-border py-8"
                />
              ) : (
                <ol>
                  {course.paths.map((path, index) => {
                    const isLast = index === course.paths.length - 1
                    return (
                      <li key={path.id} className="flex gap-3">
                        {/* Mốc lệch xuống 12px cho thẳng hàng với tên lộ trình; đường nối chạy liền qua khoảng cách giữa các card. */}
                        <div className="flex flex-col items-center" aria-hidden>
                          <span className={cn('h-3 w-px shrink-0', index > 0 && 'bg-border')} />
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-button text-sm font-bold tabular-nums text-button-foreground">
                            {index + 1}
                          </span>
                          {!isLast ? <span className="w-px flex-1 bg-border" /> : null}
                        </div>
                        <article className={cn(CARD, 'mb-3 min-w-0 flex-1 p-4')}>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="min-w-0 break-words pt-1 font-semibold leading-6 text-foreground">
                              {path.title}
                            </h3>
                            {canManage ? (
                              <CourseItemActions
                                index={index}
                                count={course.paths.length}
                                disabled={busy}
                                itemLabel="lộ trình"
                                onMove={(delta) => {
                                  const ids = moveId(
                                    course.paths.map((p) => p.id),
                                    index,
                                    delta
                                  )
                                  if (ids) reorderPaths.mutate({ courseId: course.id, ids })
                                }}
                                onEdit={() => setEditing({ kind: 'path', path })}
                                onDelete={() => setDeleting({ kind: 'path', path })}
                              />
                            ) : null}
                          </div>
                          {path.description ? (
                            <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
                              {path.description}
                            </p>
                          ) : null}
                          {/* Lộ trình chưa có tài liệu: nhân sự chỉ thấy một dòng ghi chú, admin thấy nút thêm. */}
                          {path.materials.length > 0 || canManage ? (
                            <div className="mt-3 border-t border-border/60 pt-1">
                              <CourseMaterialList
                                materials={path.materials}
                                emptyText={null}
                                {...materialHandlers(path.materials, path.id)}
                              />
                              {canManage ? (
                                <AddMaterialButton
                                  label="Thêm tài liệu"
                                  onClick={() =>
                                    setEditing({
                                      kind: 'material',
                                      material: null,
                                      pathId: path.id,
                                    })
                                  }
                                />
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Chưa có tài liệu.</p>
                          )}
                        </article>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          ) : null}

          {showShared ? (
            <section className="min-w-0 space-y-3" aria-label="Tài liệu chung">
              <SectionHeader title="Tài liệu chung" count={course.materials.length} />
              <div className={cn(CARD, 'px-4 py-2')}>
                <CourseMaterialList
                  materials={course.materials}
                  emptyText="Chưa có tài liệu dùng chung cho cả khoá."
                  {...materialHandlers(course.materials, null)}
                />
                {canManage ? (
                  <div className="border-t border-border/60 pt-1">
                    <AddMaterialButton
                      label="Thêm tài liệu chung"
                      onClick={() => setEditing({ kind: 'material', material: null, pathId: null })}
                    />
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
          <CourseMaterialFormDialog
            open={editing?.kind === 'material'}
            onOpenChange={(open) => !open && setEditing(null)}
            course={course}
            material={editing?.kind === 'material' ? editing.material : null}
            defaultPathId={editing?.kind === 'material' ? editing.pathId : null}
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
