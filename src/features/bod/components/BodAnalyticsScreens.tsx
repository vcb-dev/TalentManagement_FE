import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardSection } from '@/components/shared/DashboardSection'

function PlaceholderBlock({
  title,
  description,
  bullets,
  className,
}: {
  title: string
  description: string
  bullets: string[]
  className?: string
}) {
  return (
    <DashboardSection
      title={title}
      description={description}
      className={className}
      contentClassName="pt-0"
    >
      <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </DashboardSection>
  )
}

export function BodTraineeRankingScreen() {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-4 md:px-6 md:py-8">
      <PageHeader
        title="Điểm tập sự cao nhất"
        description="Bảng xếp hạng nhân viên tập sự theo điểm — nhận diện nhân tài nổi bật sớm."
      />
      <PlaceholderBlock
        className="mt-4"
        title="Luồng dự kiến"
        description="Bảng xếp hạng từ dữ liệu thi/điểm tích lũy giai đoạn tập sự."
        bullets={['Lọc kỳ / phòng ban', 'Sắp xếp theo điểm', 'Export / drill-down hồ sơ']}
      />
    </div>
  )
}

export function BodTeamComparisonScreen() {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-4 md:px-6 md:py-8">
      <PageHeader
        title="Team hoạt động xuất sắc"
        description="So sánh hiệu suất giữa các team — tỉ lệ đạt kỳ thi, tốc độ thăng cấp, số bài hoàn thành."
      />
      <PlaceholderBlock
        className="mt-4"
        title="Luồng dự kiến"
        description="Biểu đồ so sánh đa tiêu chí giữa team."
        bullets={[
          'Tỉ lệ đạt kỳ thi theo team',
          'Tốc độ thăng cấp / thăng sao trung bình',
          'Số bài checklist hoàn thành',
        ]}
      />
    </div>
  )
}
