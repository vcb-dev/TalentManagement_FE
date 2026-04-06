import { BarChart3, Calendar, Target } from 'lucide-react'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

/** Màn hình nhân viên: KPI/OKR được giao + báo cáo tháng (nội dung nối API sau). */
export function MemberKpiOkrScreen() {
  return (
    <div className="mx-auto max-w-[900px] px-3 py-6 md:px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-game-soft-foreground md:text-3xl">
          KPI & OKR của tôi
        </h1>
        <p className="mt-1.5 text-sm text-game-muted">
          Xem chỉ tiêu được giao và báo cáo tiến độ hàng tháng (theo team).
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
            <Target className="h-5 w-5 text-game-accent" strokeWidth={2} />
            <span className="font-bold">KPI & OKR được giao</span>
          </div>
          <p className="text-sm leading-relaxed text-game-muted">
            Dữ liệu giao KPI/OKR theo từng thành viên sẽ hiển thị tại đây sau khi backend sẵn sàng.
          </p>
        </div>

        <div
          className={cn(
            'rounded-2xl border border-[hsl(248_35%_90%)] bg-white/90 p-5 shadow-[0_8px_28px_-12px_rgb(106_90_224/0.2)]',
            CARD_ENTRANCE_HOVER
          )}
        >
          <div className="mb-3 flex items-center gap-2 text-game-soft-foreground">
            <Calendar className="h-5 w-5 text-game-accent" strokeWidth={2} />
            <span className="font-bold">Báo cáo hàng tháng</span>
          </div>
          <p className="text-sm leading-relaxed text-game-muted">
            Báo cáo theo tháng (tiến độ, kết quả) — quyền xem theo vai trò nhân viên.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'mt-6 rounded-2xl border border-dashed border-game-accent/30 bg-game-accent/[0.06] p-4 text-sm text-game-muted',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-game-accent" strokeWidth={2} />
          <p>
            Quyền: <span className="font-semibold text-game-soft-foreground">view</span> trên tài nguyên{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">kpi</code>,{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">okr</code>,{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">monthly_report</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
