import { ClipboardList } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { cn } from '@/lib/utils'
import { ManagerScreenLayout } from './ManagerScreenLayout'

export function ManagerReviewSubmissionsScreen() {
  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Duyệt bài làm sau chấm</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              Xem tick và nhận xét của Teacher, phê duyệt hoặc trả về làm lại trước khi ghi nhận vào
              lộ trình.
            </p>
          </div>
        </div>

        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Tính năng đang phát triển"
          description="Màn duyệt bài làm sau chấm sẽ sớm ra mắt. Vui lòng quay lại sau."
        />
      </div>
    </ManagerScreenLayout>
  )
}
