import { BarChart3, Target, Users } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

/** Màn hình leader: giao KPI/OKR cho từng member + báo cáo tháng team (nội dung nối API sau). */
export function LeaderKpiOkrScreen() {
  return (
    <div className="mx-auto max-w-[1000px] px-3 py-6 md:px-4">
      <div className={cn('mb-6', PAGE_HEADER_SURFACE)}>
        <h1 className={PAGE_HEADER_TITLE}>
          <span className={PAGE_HEADER_GRADIENT}>KPI & OKR trong team</span>
        </h1>
        <p className={PAGE_HEADER_DESCRIPTION}>
          Phân bổ chỉ tiêu cho từng thành viên và theo dõi báo cáo hàng tháng.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={cn(
            'rounded-2xl border border-[hsl(248_35%_90%)] bg-white/90 p-5 shadow-[0_8px_28px_-12px_rgb(106_90_224/0.2)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="mb-3 flex items-center gap-2 text-game-soft-foreground">
            <Users className="h-5 w-5 text-game-accent" strokeWidth={2} />
            <span className="font-bold">Giao KPI & OKR theo thành viên</span>
          </div>
          <p className="text-sm leading-relaxed text-game-muted">
            Danh sách team và form giao KPI/OKR sẽ kết nối API sau. Quyền:{' '}
            <span className="font-semibold text-game-soft-foreground">create / edit / view</span> trên{' '}
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs">kpi</code>,{' '}
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs">okr</code>.
          </p>
        </div>

        <div
          className={cn(
            'rounded-2xl border border-[hsl(248_35%_90%)] bg-white/90 p-5 shadow-[0_8px_28px_-12px_rgb(106_90_224/0.2)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="mb-3 flex items-center gap-2 text-game-soft-foreground">
            <BarChart3 className="h-5 w-5 text-game-accent" strokeWidth={2} />
            <span className="font-bold">Báo cáo hàng tháng (team)</span>
          </div>
          <p className="text-sm leading-relaxed text-game-muted">
            Tổng hợp báo cáo tháng của team — quyền{' '}
            <span className="font-semibold text-game-soft-foreground">create / edit / view</span> trên{' '}
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs">monthly_report</code>.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'mt-6 flex items-start gap-2 rounded-2xl border border-dashed border-sky-400/35 bg-sky-500/[0.07] p-4 text-sm text-game-muted',
          CARD_ENTRANCE_HOVER
        )}
      >
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" strokeWidth={2} />
        <p>
          Role <span className="font-semibold text-game-soft-foreground">LEADER</span> — tách biệt với{' '}
          <span className="font-semibold">MANAGER</span> (vận hành lớp, thi, duyệt thăng cấp).
        </p>
      </div>
    </div>
  )
}
