import { PageHeader } from '@/components/shared/PageHeader'
import { MemberClassesPanel } from '@/features/learning-path/components/MemberLearningPathViews'
import { MyLearningMaterialsList } from '@/features/learning-materials/components/MyLearningMaterialsList'
import { useMyLearningMaterials } from '@/features/learning-materials/hooks'

/** Mọi lớp nhân sự đang học — lớp lao động tri thức lẫn lớp học khác (trước đây tách trang `/other-classes`). */
export function MemberLearningClassesScreen() {
  const { data: materials = [] } = useMyLearningMaterials()

  return (
    <>
      <PageHeader title="Lớp học của tôi" />
      <div className="pb-6">
        <MemberClassesPanel />
      </div>
      {materials.length > 0 ? (
        <div className="pb-6">
          <h2 className="mb-3 text-sm font-bold text-foreground">Tài liệu học</h2>
          <MyLearningMaterialsList />
        </div>
      ) : null}
    </>
  )
}
