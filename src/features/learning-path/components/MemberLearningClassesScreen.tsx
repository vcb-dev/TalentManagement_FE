import { PageHeader } from '@/components/shared/PageHeader'
import { MemberClassesPanel } from '@/features/learning-path/components/MemberLearningPathViews'

export function MemberLearningClassesScreen() {
  return (
    <>
      <PageHeader
        title="Lớp học của tôi"
        description="Trong mỗi kỳ, mỗi nhân sự chỉ được xếp một lớp. Bảng bên dưới hiển thị lớp của kỳ hiện tại (dữ liệu minh họa — sẽ nối API)."
      />
      <div className="pb-6">
        <MemberClassesPanel />
      </div>
    </>
  )
}
