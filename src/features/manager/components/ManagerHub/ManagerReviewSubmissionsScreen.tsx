import { ClipboardList } from 'lucide-react'
import { ManagerHubPageHeader } from './ManagerHubPageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ManagerScreenLayout } from './ManagerScreenLayout'

export function ManagerReviewSubmissionsScreen() {
  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <ManagerHubPageHeader
          title="Duyệt bài làm sau chấm"
          description="Xem tick và nhận xét của Teacher, phê duyệt hoặc trả về làm lại trước khi ghi nhận vào lộ trình."
        />

        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Tính năng đang phát triển"
          description="Màn duyệt bài làm sau chấm sẽ sớm ra mắt. Vui lòng quay lại sau."
        />
      </div>
    </ManagerScreenLayout>
  )
}
