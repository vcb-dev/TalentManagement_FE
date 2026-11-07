import { ExternalLink, FileText, Link as LinkIcon, Paperclip } from 'lucide-react'
import { resolveFileUrl } from '@/lib/utils'
import type { CourseMaterial } from '../types'
import { CourseItemActions } from './CourseItemActions'

const LINK_CLASS =
  'inline-flex max-w-full items-center gap-1 font-medium text-button hover:underline'

/** Danh sách tài liệu dạng dòng, phân cách bằng đường kẻ — nằm trong card lộ trình / khối tài liệu chung. */
export function CourseMaterialList({
  materials,
  canManage,
  busy,
  emptyText,
  onMove,
  onEdit,
  onDelete,
}: {
  materials: CourseMaterial[]
  canManage: boolean
  busy?: boolean
  /** `null` = không hiện gì khi rỗng (nơi dùng tự xử lý). */
  emptyText: string | null
  onMove: (index: number, delta: -1 | 1) => void
  onEdit: (material: CourseMaterial) => void
  onDelete: (material: CourseMaterial) => void
}) {
  if (materials.length === 0) {
    return emptyText ? <p className="py-2 text-sm text-muted-foreground">{emptyText}</p> : null
  }

  return (
    <ul className="divide-y divide-border/60">
      {materials.map((m, index) => {
        const Icon = m.fileRef ? FileText : LinkIcon
        return (
          <li key={m.id} className="flex items-start gap-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-button/10 text-button">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold leading-5 text-foreground">
                {m.title}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs leading-5">
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    Mở link
                  </a>
                ) : null}
                {m.fileRef ? (
                  <a
                    href={resolveFileUrl(m.fileRef)}
                    target="_blank"
                    rel="noreferrer"
                    className={LINK_CLASS}
                  >
                    <Paperclip className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{m.fileName || 'Tải file'}</span>
                  </a>
                ) : null}
              </div>
              {m.note ? (
                <p className="mt-0.5 whitespace-pre-line break-words text-xs leading-5 text-muted-foreground">
                  {m.note}
                </p>
              ) : null}
            </div>
            {canManage ? (
              <CourseItemActions
                index={index}
                count={materials.length}
                disabled={busy}
                itemLabel="tài liệu"
                onMove={(delta) => onMove(index, delta)}
                onEdit={() => onEdit(m)}
                onDelete={() => onDelete(m)}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
