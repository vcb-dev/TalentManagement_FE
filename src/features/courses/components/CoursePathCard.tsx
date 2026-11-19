import type { ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  CourseMaterial,
  CoursePath,
  CourseSection,
  LinkedCourse,
  MaterialTarget,
} from '../types'
import { CourseItemActions } from './CourseItemActions'
import { CourseMaterialList } from './CourseMaterialList'

export const COURSE_CARD_CLASS =
  'rounded-xl border border-border/80 bg-card shadow-[var(--shadow-card)]'

/** Nút thêm nhỏ (học phần / tài liệu) đặt cuối một khối. */
export function AddItemButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 rounded-lg px-2 text-button hover:text-button"
      onClick={onClick}
    >
      <Plus className="size-3.5" aria-hidden />
      {children}
    </Button>
  )
}

/** Props cho `CourseMaterialList` của một nhóm tài liệu — nơi dùng truyền sẵn sắp xếp / sửa / xoá. */
export type MaterialGroupProps = (
  group: CourseMaterial[],
  target: MaterialTarget
) => {
  canManage: boolean
  busy: boolean
  onMove: (index: number, delta: -1 | 1) => void
  onEdit: (material: CourseMaterial) => void
  onDelete: (material: CourseMaterial) => void
}

export type CoursePathCardActions = {
  onMovePath: (delta: -1 | 1) => void
  onEditPath: () => void
  onDeletePath: () => void
  onAddSection: () => void
  onMoveSection: (sectionIndex: number, delta: -1 | 1) => void
  onEditSection: (section: CourseSection) => void
  onDeleteSection: (section: CourseSection) => void
  onAddMaterial: (target: MaterialTarget) => void
  materialGroup: MaterialGroupProps
}

/** Nhãn nhỏ đầu một khối trong card khoá học. */
function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

/**
 * Một khoá học trong lộ trình: tên + mô tả → các học phần (đánh số "khoá.học phần", mỗi học phần có tài
 * liệu riêng) → tài liệu chung của khoá. Nhân sự không thấy khối trống; admin thấy nút thêm ở mọi cấp.
 */
export function CoursePathCard({
  path,
  index,
  count,
  canManage,
  busy,
  highlighted = false,
  actions,
}: {
  path: CoursePath
  index: number
  count: number
  canManage: boolean
  busy: boolean
  /** Khoá được mở từ trang cá nhân (`?pathId=`) — viền nổi để mắt tìm ra ngay sau khi cuộn tới. */
  highlighted?: boolean
  actions: CoursePathCardActions
}) {
  const pathTarget: MaterialTarget = { pathId: path.id, sectionId: null }
  const hasSections = path.sections.length > 0
  const hasOwnContent = hasSections || path.materials.length > 0
  const linked = path.linkedCourse

  return (
    <article
      className={cn(
        COURSE_CARD_CLASS,
        'mb-3 min-w-0 flex-1 p-4',
        highlighted && 'border-button/50 ring-2 ring-button/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words pt-1 font-semibold leading-6 text-foreground">
          {path.title}
        </h3>
        {canManage ? (
          <CourseItemActions
            index={index}
            count={count}
            disabled={busy}
            itemLabel="khoá học"
            onMove={actions.onMovePath}
            onEdit={actions.onEditPath}
            onDelete={actions.onDeletePath}
          />
        ) : null}
      </div>
      {path.description ? (
        <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
          {path.description}
        </p>
      ) : null}

      {linked ? <LinkedCourseBlock linked={linked} /> : null}

      {!hasOwnContent && !canManage ? (
        linked ? null : (
          <p className="mt-1 text-sm text-muted-foreground">
            Nội dung khoá học đang được cập nhật.
          </p>
        )
      ) : (
        // divide-y: chỉ kẻ giữa các khối thực sự hiện (học phần / tài liệu chung / nút admin) — không kẻ đôi.
        <div className="mt-3 divide-y divide-border/60 border-t border-border/60">
          {hasSections ? (
            <ol className="divide-y divide-border/60" aria-label={`Học phần của ${path.title}`}>
              {path.sections.map((section, sectionIndex) => (
                <CourseSectionItem
                  key={section.id}
                  section={section}
                  number={`${index + 1}.${sectionIndex + 1}`}
                  index={sectionIndex}
                  count={path.sections.length}
                  canManage={canManage}
                  busy={busy}
                  actions={actions}
                />
              ))}
            </ol>
          ) : null}

          {path.materials.length > 0 ? (
            <div>
              {/* Chưa chia học phần thì tài liệu của khoá hiển thị như trước, không cần nhãn "chung". */}
              {hasSections ? <BlockLabel>Tài liệu chung của khoá</BlockLabel> : null}
              <CourseMaterialList
                materials={path.materials}
                emptyText={null}
                {...actions.materialGroup(path.materials, pathTarget)}
              />
            </div>
          ) : null}

          {canManage ? (
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <AddItemButton onClick={actions.onAddSection}>Thêm học phần</AddItemButton>
              <AddItemButton onClick={() => actions.onAddMaterial(pathTarget)}>
                {hasSections ? 'Thêm tài liệu chung' : 'Thêm tài liệu'}
              </AddItemButton>
            </div>
          ) : null}
        </div>
      )}
    </article>
  )
}

/**
 * Khoá "theo lộ trình khác": liệt kê các khoá của lộ trình đó (VD 5 cấp độ Lao động tri thức), mỗi dòng mở
 * thẳng khoá tương ứng bên lộ trình kia. Nhân sự chỉ nhận liên kết khi lộ trình kia đang mở.
 */
function LinkedCourseBlock({ linked }: { linked: LinkedCourse }) {
  return (
    <div className="mt-3 rounded-lg border border-button/20 bg-button/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-xs font-semibold text-muted-foreground">
          Theo lộ trình <span className="text-foreground">{linked.title}</span>
          {linked.isActive ? null : ' (đang ẩn với nhân sự)'}
        </p>
        <Link
          to="/courses"
          search={{ courseId: linked.id }}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-button hover:underline"
        >
          Xem lộ trình
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {linked.paths.length > 0 ? (
        <ol className="mt-2 space-y-0.5" aria-label={`Khoá học của ${linked.title}`}>
          {linked.paths.map((p, i) => (
            <li key={p.id}>
              <Link
                to="/courses"
                search={{ courseId: linked.id, pathId: p.id }}
                className="flex items-start gap-2.5 rounded-md px-1 py-1 text-sm font-semibold leading-6 text-foreground transition-colors hover:bg-button/[0.06] hover:text-button"
              >
                <span className="mt-0.5 min-w-7 shrink-0 rounded-md bg-button/10 px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-button">
                  {i + 1}
                </span>
                <span className="min-w-0 break-words">{p.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Lộ trình này chưa có khoá học.</p>
      )}
    </div>
  )
}

function CourseSectionItem({
  section,
  number,
  index,
  count,
  canManage,
  busy,
  actions,
}: {
  section: CourseSection
  /** "khoá.học phần", vd. "2.3". */
  number: string
  index: number
  count: number
  canManage: boolean
  busy: boolean
  actions: CoursePathCardActions
}) {
  const target: MaterialTarget = { pathId: null, sectionId: section.id }
  const showMaterials = section.materials.length > 0 || canManage

  return (
    <li className="py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 min-w-9 shrink-0 rounded-md bg-button/10 px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-button">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold leading-6 text-foreground">
            {section.title}
          </h4>
          {section.description ? (
            <p className="whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
              {section.description}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <CourseItemActions
            index={index}
            count={count}
            disabled={busy}
            itemLabel="học phần"
            onMove={(delta) => actions.onMoveSection(index, delta)}
            onEdit={() => actions.onEditSection(section)}
            onDelete={() => actions.onDeleteSection(section)}
          />
        ) : null}
      </div>
      {showMaterials ? (
        // Thụt vào thẳng hàng tên học phần (ô số min-w-9 + gap-2.5) từ màn sm trở lên.
        <div className="sm:pl-[46px]">
          <CourseMaterialList
            materials={section.materials}
            emptyText={null}
            {...actions.materialGroup(section.materials, target)}
          />
          {canManage ? (
            <AddItemButton onClick={() => actions.onAddMaterial(target)}>
              Thêm tài liệu
            </AddItemButton>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
