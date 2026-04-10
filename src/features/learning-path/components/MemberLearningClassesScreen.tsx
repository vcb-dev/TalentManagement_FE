import { PageHeader } from '@/components/shared/PageHeader'
import { MemberClassesPanel } from '@/features/learning-path/components/MemberLearningPathViews'

export function MemberLearningClassesScreen() {
  return (
    <>
      <PageHeader
        title="Lớp học của tôi"
        description="Trong mỗi kỳ, mỗi nhân sự chỉ được xếp một lớp. Bảng bên dưới hiển thị lớp hiện tại của bạn và lịch học buổi do giáo viên cập nhật."
      />
      <div className="pb-6">
        <MemberClassesPanel />
      </div>
    </>
  )
}
