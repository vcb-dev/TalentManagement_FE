import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

type GuidanceVariant = 'KINH_DOANH' | 'TRAFFIC'

interface LeaderKpiGuidanceProps {
  variant: GuidanceVariant
}

export function LeaderKpiGuidance({ variant }: LeaderKpiGuidanceProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 text-sm shadow-sm dark:border-sky-800 dark:bg-sky-950/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-semibold text-sky-800 dark:text-sky-200"
      >
        <Info className="h-4 w-4 shrink-0 text-sky-500" />
        <span className="flex-1 text-xs">
          {variant === 'TRAFFIC'
            ? 'Hướng dẫn nhập KPI — Traffic Team'
            : 'Hướng dẫn nhập KPI — Kinh Doanh'}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-sky-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-sky-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-sky-200 px-4 pb-3 pt-2.5 dark:border-sky-800 space-y-3">
          {variant === 'TRAFFIC' ? <TrafficGuidance /> : <KinhDoanhGuidance />}
        </div>
      )}
    </div>
  )
}

function TrafficGuidance() {
  return (
    <>
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>⚠ Bắt buộc:</strong> Nhấn <strong>"Tự seed theo catalog"</strong> để tạo KPI cá nhân
        cho từng thành viên trước khi nhập kết quả. Không seed → hệ thống không tính thưởng cá nhân.
      </div>

      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs dark:bg-red-950/20 dark:border-red-900/40">
        <p className="font-bold text-red-600 dark:text-red-400 mb-1.5 text-[11px] uppercase tracking-wide">
          Bắt buộc nhập
        </p>
        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            • Tổng view traffic team <span className="text-slate-400">(views)</span>
          </li>
          <li>
            • Doanh thu team traffic <span className="text-slate-400">(VND)</span>
          </li>
          <li>
            • Traffic cá nhân tháng <span className="text-slate-400">(views)</span>
          </li>
          <li>
            • Doanh thu cá nhân tháng <span className="text-slate-400">(VND)</span>
          </li>
        </ul>
      </div>

      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
        <li>
          Duyệt <strong className="text-slate-700 dark:text-slate-300">OK</strong> tất cả KPI trước
          ngày 1 tháng sau — chưa duyệt sẽ không tính thưởng.
        </li>
        <li>
          Thưởng team giảm theo số NV không đạt: <strong>0→100% / 1→70% / 2→60% / ≥3→0%</strong>.
        </li>
        <li>
          NV dưới 2 tháng thâm niên và NV không đạt 100% KPI cá nhân sẽ không nhận thưởng Traffic.
        </li>
      </ul>
    </>
  )
}

function KinhDoanhGuidance() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 dark:bg-red-950/20 dark:border-red-900/40">
          <p className="font-bold text-red-600 dark:text-red-400 mb-1.5 text-[11px] uppercase tracking-wide">
            Bắt buộc nhập
          </p>
          <ul className="space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              • Doanh thu lên đơn <span className="text-slate-400">(VND)</span>
            </li>
            <li>
              • Số đơn hàng chốt được <span className="text-slate-400">(đơn)</span>
            </li>
          </ul>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 dark:bg-slate-800/30 dark:border-slate-700">
          <p className="font-bold text-slate-500 dark:text-slate-400 mb-1.5 text-[11px] uppercase tracking-wide">
            Không bắt buộc
          </p>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400">
            <li>• Giá trị đơn lớn nhất</li>
            <li>• Cross sale / Upsale</li>
            <li>• Đơn từ KH cũ (lần ≥ 2)</li>
            <li>• Tương tác KH (Part-time)</li>
          </ul>
        </div>
      </div>

      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
        <li>
          Duyệt <strong className="text-slate-700 dark:text-slate-300">OK</strong> tất cả KPI trước
          ngày 1 tháng sau — chưa duyệt sẽ không tính thưởng.
        </li>
        <li>Giải Team chỉ kích hoạt khi &gt;80% team có doanh thu &gt; 1,5 tỷ/tháng.</li>
        <li>Part-time chỉ thi đua giải 1.5 (tương tác KH).</li>
      </ul>
    </>
  )
}
