import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSyncEditorClasses } from '@/features/editor-classes/hooks'
import type { editorClassSyncReportApiSchema } from '@/features/editor-classes/schemas'
import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { z } from 'zod'

type SyncReport = z.infer<typeof editorClassSyncReportApiSchema>

function SyncPreviewCard({ report }: { report: SyncReport }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-bold text-foreground">
        {report.dryRun ? 'Xem trước đồng bộ' : 'Kết quả đồng bộ'} · {report.totalEditors} editor
      </h3>
      <div className="mt-2 space-y-2">
        {report.teams.map((t) => (
          <div
            key={t.teamId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
          >
            <div>
              <span className="font-semibold text-foreground">{t.className}</span>
              <span className="ml-2 text-muted-foreground">
                GV: {t.teacherName ?? '— (team chưa có leader)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  t.action === 'created' ? 'success' : t.action === 'updated' ? 'warning' : 'muted'
                }
              >
                {t.action === 'created'
                  ? 'Tạo mới'
                  : t.action === 'updated'
                    ? 'Cập nhật'
                    : 'Không đổi'}
              </Badge>
              {t.addedMembers > 0 ? (
                <span className="text-emerald-600">+{t.addedMembers}</span>
              ) : null}
              {t.removedMembers > 0 ? (
                <span className="text-rose-600">-{t.removedMembers}</span>
              ) : null}
              {t.pendingUnderOneMonth.length > 0 ? (
                <span className="text-muted-foreground" title={t.pendingUnderOneMonth.join(', ')}>
                  {t.pendingUnderOneMonth.length} chưa đủ 1 tháng
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {report.closedOrphanClasses.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Đã đóng {report.closedOrphanClasses.length} lớp không còn editor:{' '}
            {report.closedOrphanClasses.map((c) => c.name).join(', ')}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

/**
 * Nội dung tab "Lớp Editor" của trang Quản lý lớp học.
 * `children` = lưới thẻ lớp Editor (dùng chung ClassCard với các lớp khác);
 * `canManage` mở công cụ đồng bộ. Tạo lịch thi hàng loạt nằm ở trang Lịch thi & Đề thi (`EditorBulkExamDialog`).
 */
export function EditorClassesSection({
  children,
  canManage,
}: {
  children: ReactNode
  canManage: boolean
}) {
  const sync = useSyncEditorClasses()
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null)

  return (
    <section aria-labelledby="editor-classes-heading" className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 id="editor-classes-heading" className="text-lg font-bold text-foreground">
            Lớp Editor
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi team có editor sẽ có 1 lớp riêng — leader team làm giáo viên. Đồng bộ để tự động tạo
            lớp và thêm editor đủ 1 tháng.
            {canManage ? (
              <>
                {' '}
                Lịch thi hàng loạt (chấm chéo) tạo ở{' '}
                <Link
                  to="/manager/exam-schedule"
                  className="font-semibold text-button underline-offset-2 hover:underline"
                >
                  Lịch thi & Đề thi
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={sync.isPending}
              onClick={() => sync.mutate(true, { onSuccess: setSyncReport })}
            >
              <RefreshCw className="h-4 w-4" />
              Xem trước
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={sync.isPending}
              onClick={() => sync.mutate(false, { onSuccess: setSyncReport })}
            >
              <RefreshCw className="h-4 w-4" />
              {sync.isPending ? 'Đang đồng bộ...' : 'Đồng bộ lớp Editor'}
            </Button>
          </div>
        ) : null}
      </div>

      {syncReport ? <SyncPreviewCard report={syncReport} /> : null}

      {children}
    </section>
  )
}
