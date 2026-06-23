import { KpiOkrWorkspace } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { VinhDanhSlide } from '@/features/employee-dashboard/components/VinhDanhSlide'
import { DashboardSection } from '@/components/shared/DashboardSection'
import { Trophy } from 'lucide-react'

/** Leader: ba bảng KPI / tổng chỉ số / form theo team. */
export function LeaderKpiOkrScreen() {
  return (
    <div className="space-y-6">
      <DashboardSection
        title="Bảng vinh danh"
        description="Top performer theo chỉ số tháng hiện tại."
        icon={<Trophy className="h-4 w-4 text-amber-600" aria-hidden />}
        className="overflow-visible"
        contentClassName="p-0 sm:p-0"
      >
        <VinhDanhSlide />
      </DashboardSection>
      <KpiOkrWorkspace
        variant="leader"
        title="KPI & OKR trong team"
        description="Theo từng tháng đã chọn: phần 1 giao mục tiêu KPI/OKR; phần 2 nhập kết quả và đánh giá cùng kỳ đã lọc. Cùng team có thêm tổng chỉ số và form câu hỏi."
      />
    </div>
  )
}
