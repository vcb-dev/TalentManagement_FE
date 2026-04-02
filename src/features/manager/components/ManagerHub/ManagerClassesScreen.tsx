import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GraduationCap, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { MOCK_MANAGER_CLASSES, type ManagerClassRow } from '@/features/manager/mock/mockManagerHub'
import { ManagerScreenLayout } from './ManagerScreenLayout'

const STATUS_LABEL: Record<ManagerClassRow['status'], { label: string; className: string }> = {
  open: { label: 'Đang mở', className: 'bg-emerald-500/12 text-emerald-900 ring-1 ring-emerald-500/20' },
  full: { label: 'Đủ chỗ', className: 'bg-amber-500/12 text-amber-950 ring-1 ring-amber-500/20' },
  closed: { label: 'Đã đóng', className: 'bg-muted text-muted-foreground' },
}

export function ManagerClassesScreen() {
  const [rows] = useState(MOCK_MANAGER_CLASSES)
  const [name, setName] = useState('')

  const totalMembers = rows.reduce((a, r) => a + r.memberCount, 0)
  const openCount = rows.filter((r) => r.status === 'open').length

  const onCreate = () => {
    const n = name.trim()
    if (n.length < 3) {
      toast.error('Tên lớp ít nhất 3 ký tự')
      return
    }
    toast.success(`Đã tạo lớp “${n}” (demo — chưa lưu server)`)
    setName('')
  }

  return (
    <ManagerScreenLayout
      title="Chia lớp học"
      subtitle="Tạo lớp, xếp nhân viên vào lớp và gắn kỳ thi tương ứng. Dữ liệu minh họa — sẵn sàng nối API."
      toolbarExtra={
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          Sau thi, phân lớp chi tiết tại màn phân loại theo kỳ thi
        </span>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            {
              k: 'c',
              className:
                'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-teal-500/[0.06] p-4 shadow-[var(--shadow-card)] ring-1 ring-primary/10',
              body: (
                <>
                  <div className="text-xs font-semibold text-primary md:text-sm">Lớp đang mở</div>
                  <div className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-3xl font-extrabold text-transparent">
                    {openCount}
                  </div>
                </>
              ),
            },
            {
              k: 'm',
              className:
                'rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-card to-teal-50/80 p-4 shadow-[var(--shadow-card)] ring-1 ring-emerald-500/15',
              body: (
                <>
                  <div className="text-xs font-semibold text-emerald-800 md:text-sm">Tổng học viên</div>
                  <div className="text-3xl font-extrabold text-emerald-700">{totalMembers}</div>
                </>
              ),
            },
            {
              k: 'x',
              className:
                'rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-card to-fuchsia-50/40 p-4 shadow-[var(--shadow-card)] ring-1 ring-violet-400/15',
              body: (
                <>
                  <div className="text-xs font-semibold text-violet-900 md:text-sm">Lớp trong kỳ</div>
                  <div className="text-3xl font-extrabold text-violet-800">{rows.length}</div>
                </>
              ),
            },
            {
              k: 'l',
              className:
                'rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border/80',
              body: (
                <>
                  <div className="text-xs font-semibold text-muted-foreground md:text-sm">Liên kết nhanh</div>
                  <Link
                    to="/manager/exam-schedule"
                    className="mt-1 inline-flex text-sm font-semibold text-primary hover:underline"
                  >
                    Đặt lịch thi →
                  </Link>
                </>
              ),
            },
          ] as const
        ).map((s) => (
          <div key={s.k} className={cn(s.className, CARD_ENTRANCE_HOVER)}>
            {s.body}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'mb-6 flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-4 md:flex-row md:items-end',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-class" className="text-xs font-semibold text-muted-foreground">
            Tạo lớp mới
          </label>
          <input
            id="new-class"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Tập sự — Đợt Q2/2026"
            className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none ring-offset-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button type="button" className="shrink-0 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Tạo lớp
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const st = STATUS_LABEL[row.status]
          return (
            <div
              key={row.id}
              className={cn(
                'flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/5',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-teal-500/10 text-primary">
                    <GraduationCap className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold leading-snug text-foreground">{row.name}</h3>
                    <p className="text-xs text-muted-foreground">{row.levelLabel}</p>
                  </div>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold', st.className)}>
                  {st.label}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={2} />
                  <span>
                    <span className="font-semibold text-foreground">{row.memberCount}</span> thành viên
                  </span>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/90">Kỳ thi:</span> {row.examLabel}
                </div>
                <div className="text-xs text-muted-foreground">Cập nhật {row.updatedAt}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    toast.info('Chi tiết lớp & danh sách học viên — nối API (Teacher xem cùng dữ liệu).')
                  }
                >
                  Chi tiết lớp
                </Button>
                <Button type="button" variant="secondary" size="sm" className="flex-1" asChild>
                  <Link to="/exam/$examId/classify" params={{ examId: '11111111-1111-4111-8111-111111111101' }}>
                    Phân lớp sau thi
                  </Link>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </ManagerScreenLayout>
  )
}
