import { KpiOkrWorkspace } from '@/features/kpi-okr/components/KpiOkrWorkspace'

/** Leader: ba bảng KPI / tổng chỉ số / form theo team. */
export function LeaderKpiOkrScreen() {
  return (
    <KpiOkrWorkspace
      variant="leader"
      title="KPI & OKR trong team"
      description="Theo từng tháng đã chọn: phần 1 giao mục tiêu KPI/OKR tháng đó; phần 2 cập nhật kết quả và đánh giá của tháng liền trước. Cùng team có thêm tổng chỉ số và form câu hỏi."
    />
  )
}
