import { KpiOkrWorkspace } from '@/features/kpi-okr/components/KpiOkrWorkspace'
import { VinhDanhSlide } from '@/features/employee-dashboard/components/VinhDanhSlide'
import { DashboardSection } from '@/components/shared/DashboardSection'
import { Trophy } from 'lucide-react'

/** Nhân viên: xem KPI/OKR và form theo team (chỉnh tiến độ qua API /me khi có assignment). */
export function MemberKpiOkrScreen() {
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
        variant="member"
        title="KPI & OKR của tôi"
        description="Mỗi lần nhập theo tháng: xem mục tiêu và cập nhật kết quả (tiến độ) cùng kỳ đã chọn. Có tổng chỉ số và form câu hỏi theo tháng."
      />
    </div>
  )
}
