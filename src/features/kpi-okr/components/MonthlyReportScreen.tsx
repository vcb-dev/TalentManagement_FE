import { BarChart3, Calendar } from 'lucide-react'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

/** Báo cáo hàng tháng — member (cá nhân) / leader (team). Nội dung nối API sau. */
export function MonthlyReportScreen() {
  const role = useAuthStore((s) => s.user?.role)
  const isLeader = role === 'LEADER'

  return (
    <div className="mx-auto max-w-[900px] px-3 py-6 md:px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-game-soft-foreground md:text-3xl">
          {isLeader ? 'Báo cáo hàng tháng (team)' : 'Báo cáo hàng tháng'}
        </h1>
        <p className="mt-1.5 text-sm text-game-muted">
          {isLeader
            ? 'Tổng hợp báo cáo theo tháng của các thành viên trong team.'
            : 'Theo dõi báo cáo tiến độ KPI/OKR theo từng tháng.'}
        </p>
      </div>

      <div
        className={cn(
          'rounded-2xl border border-[hsl(248_35%_90%)] bg-white/90 p-6 shadow-[0_8px_28px_-12px_rgb(106_90_224/0.2)]',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="mb-4 flex items-center gap-2 text-game-soft-foreground">
          <Calendar className="h-5 w-5 text-game-accent" strokeWidth={2} />
          <span className="font-bold">Chọn kỳ báo cáo</span>
        </div>
        <p className="text-sm leading-relaxed text-game-muted">
          Bảng chọn tháng/năm và danh sách báo cáo sẽ hiển thị tại đây sau khi tích hợp API.
        </p>
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-dashed border-game-accent/25 bg-game-accent/[0.05] p-3 text-xs text-game-muted">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-game-accent" strokeWidth={2} />
          <span>
            Quyền: <span className="font-semibold text-game-soft-foreground">view</span> trên{' '}
            <code className="rounded bg-white/80 px-1 py-0.5">monthly_report</code>
            {isLeader ? (
              <>
                {' '}
                · Leader thêm <span className="font-semibold">create / edit</span> khi gửi/tổng hợp báo cáo team.
              </>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  )
}
