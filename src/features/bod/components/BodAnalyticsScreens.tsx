import { PageHeader } from '@/components/shared/PageHeader'

function PlaceholderBlock({
  title,
  description,
  bullets,
}: {
  title: string
  description: string
  bullets: string[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-foreground/90">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

export function BodTraineeRankingScreen() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <PageHeader
        title="Điểm tập sự cao nhất"
        description="Bảng xếp hạng nhân viên tập sự theo điểm — nhận diện nhân tài nổi bật sớm."
      />
      <PlaceholderBlock
        title="Luồng dự kiến"
        description="Bảng xếp hạng từ dữ liệu thi/điểm tích lũy giai đoạn tập sự."
        bullets={['Lọc kỳ / phòng ban', 'Sắp xếp theo điểm', 'Export / drill-down hồ sơ']}
      />
    </div>
  )
}

export function BodTeamComparisonScreen() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <PageHeader
        title="Team hoạt động xuất sắc"
        description="So sánh hiệu suất giữa các team — tỉ lệ đạt kỳ thi, tốc độ thăng cấp, số bài hoàn thành."
      />
      <PlaceholderBlock
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
