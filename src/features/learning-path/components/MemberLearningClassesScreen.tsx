import { PageHeader } from '@/components/shared/PageHeader'
import { MemberClassesPanel } from '@/features/learning-path/components/MemberLearningPathViews'

export function MemberLearningClassesScreen({ isOther = false }: { isOther?: boolean }) {
  return (
    <>
      <PageHeader
        title={isOther ? 'Lớp học khác' : 'Lớp học của tôi'}
        description={
          isOther
            ? 'Danh sách các lớp học khác bạn tham gia (ngoài lộ trình Lao động tri thức) và lịch học buổi do giáo viên cập nhật.'
            : 'Trong mỗi kỳ, mỗi nhân sự chỉ được xếp một lớp. Bảng bên dưới hiển thị lớp hiện tại của bạn và lịch học buổi do giáo viên cập nhật.'
        }
      />
      <div className="pb-6">
        <MemberClassesPanel isOther={isOther} />
      </div>
    </>
  )
}
