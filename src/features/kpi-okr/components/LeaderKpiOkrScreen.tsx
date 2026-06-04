import { KpiOkrWorkspace } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { VinhDanhSlide } from '@/features/employee-dashboard/components/VinhDanhSlide'

/** Leader: ba bảng KPI / tổng chỉ số / form theo team. */
export function LeaderKpiOkrScreen() {
  return (
    <div className="space-y-6">
      <VinhDanhSlide />
      <KpiOkrWorkspace
        variant="leader"
        title="KPI & OKR trong team"
        description="Theo từng tháng đã chọn: phần 1 giao mục tiêu KPI/OKR; phần 2 nhập kết quả và đánh giá cùng kỳ đã lọc. Cùng team có thêm tổng chỉ số và form câu hỏi."
      />
    </div>
  )
}
