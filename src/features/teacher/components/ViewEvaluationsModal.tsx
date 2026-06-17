import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import {
  Star,
  Users,
  MessageCircle,
  BarChart3,
  TrendingUp,
  X,
  User as UserIcon,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ViewEvaluationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleId: string
  sessionTitle: string
}

const QUESTIONS = [{ id: 'q1', text: 'Dẫn dắt & chia sẻ của Host' }]

const getScoreLabel = (score: number) => {
  if (score >= 4.5) return 'Hoàn toàn đồng ý'
  if (score >= 3.5) return 'Đồng ý'
  if (score >= 2.5) return 'Trung lập'
  if (score >= 1.5) return 'Không đồng ý'
  return 'Rất không đồng ý'
}

const getScoreColor = (score: number) => {
  if (score >= 4.5) return 'text-indigo-600 bg-indigo-50'
  if (score >= 3.5) return 'text-emerald-600 bg-emerald-50'
  if (score >= 2.5) return 'text-amber-600 bg-amber-50'
  if (score >= 1.5) return 'text-sky-600 bg-sky-50'
  return 'text-orange-600 bg-orange-50'
}

export function ViewEvaluationsModal({
  open,
  onOpenChange,
  scheduleId,
  sessionTitle,
}: ViewEvaluationsModalProps) {
  const { data: evals, isLoading } = useQuery({
    queryKey: ['schedule-evaluations', scheduleId],
    queryFn: async () => {
      const res = await apiClient.get<any[]>(`/class-evaluations/schedule/${scheduleId}`)
      return res.data
    },
    enabled: open && !!scheduleId,
  })

  // Calculate averages
  const averages = QUESTIONS.map((q) => {
    const validScores = evals?.map((e) => e[q.id]).filter((v) => v != null) || []
    const avg =
      validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0
    return { ...q, avg }
  })

  const overallAvg =
    averages.length > 0 ? averages.reduce((a, b) => a + b.avg, 0) / averages.length : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[32px] border-0 p-0 shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-white/95 p-8 backdrop-blur-xl border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">
                Tổng hợp đánh giá
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                  {sessionTitle}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-xs font-black uppercase text-slate-400">Số lượng phản hồi</span>
              <span className="text-lg font-black text-blue-600">{evals?.length || 0}</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-10">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-3xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            </div>
          ) : evals?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">Chưa có đánh giá nào</h3>
              <p className="text-sm text-slate-300">
                Học viên chưa thực hiện đánh giá cho buổi học này.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Score Card - BLUE THEME */}
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <TrendingUp className="h-32 w-32" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex flex-col items-center justify-center h-32 w-32 rounded-full border-8 border-white/20 bg-white/10 shrink-0">
                    <span className="text-4xl font-black leading-none">
                      {overallAvg.toFixed(1)}
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest mt-1 opacity-60">
                      Trung bình
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Chất lượng giảng dạy</h4>
                    <p className="text-sm text-blue-100/80 leading-relaxed max-w-md">
                      Dựa trên {evals?.length} phản hồi từ học viên. Tổng thể đạt mức{' '}
                      <span className="font-bold text-white underline underline-offset-4 decoration-white/30">
                        {getScoreLabel(overallAvg)}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              {/* Likert Chart */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">
                    Chi tiết tiêu chí
                  </h4>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {averages.map((a) => (
                    <div
                      key={a.id}
                      className="group rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                          {a.text}
                        </span>
                        <div
                          className={cn(
                            'px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider',
                            getScoreColor(a.avg)
                          )}
                        >
                          {getScoreLabel(a.avg)}
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          style={{ width: `${(a.avg / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Free Text Feedback */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500 fill-blue-50" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">
                    Ý kiến học viên
                  </h4>
                </div>
                <div className="space-y-4">
                  {evals?.map((e) => (
                    <StudentFeedbackCard key={e.id} evaluation={e} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StudentFeedbackCard({ evaluation: e }: { evaluation: any }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div
      className={cn(
        'group rounded-3xl border border-slate-100 bg-white transition-all duration-300 overflow-hidden',
        isOpen ? 'shadow-xl ring-1 ring-blue-100' : 'hover:bg-slate-50/50 shadow-sm'
      )}
    >
      {/* Header - Click to toggle */}
      <div
        className="flex items-center gap-3 p-6 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 transition-transform group-hover:scale-110">
          <UserIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{e.user.fullNameLegal}</p>
          <p className="text-xs text-slate-400 truncate">{e.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black shadow-md shadow-blue-200">
            {e.totalScore?.toFixed(1) || '0.0'}
          </div>
          <div className={cn('transition-transform duration-300', isOpen ? 'rotate-180' : '')}>
            <ChevronDown className={cn('h-5 w-5', isOpen ? 'text-blue-600' : 'text-slate-400')} />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div
        className={cn(
          'transition-all duration-500 ease-in-out',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-6 pb-8 space-y-8 border-t border-slate-50 pt-6 bg-slate-50/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUESTIONS.map((q) => {
              const val = e[q.id]
              if (val == null) return null
              return (
                <div
                  key={q.id}
                  className="rounded-xl bg-white px-3 py-2.5 border border-slate-100 shadow-sm"
                >
                  <p className="text-xs font-bold text-slate-400 truncate uppercase tracking-tight">
                    {q.text}
                  </p>
                  <p className={cn('text-xs font-black mt-1', getScoreColor(val).split(' ')[0])}>
                    {getScoreLabel(val)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="space-y-5 divide-y divide-slate-100">
            {e.feedbackLacking && (
              <div className="pt-2">
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Nội dung & cuộc sống
                </p>
                <div className="rounded-2xl bg-white p-4 border border-slate-100/50 italic text-sm text-slate-600 leading-relaxed">
                  "{e.feedbackLacking}"
                </div>
              </div>
            )}
            {e.feedbackImprove && (
              <div className="pt-5">
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Góp ý cho buổi tiếp theo
                </p>
                <div className="rounded-2xl bg-white p-4 border border-slate-100/50 italic text-sm text-slate-600 leading-relaxed">
                  "{e.feedbackImprove}"
                </div>
              </div>
            )}
            {e.feedbackFree && (
              <div className="pt-5">
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Phản hồi khác
                </p>
                <div className="rounded-2xl bg-white p-4 border border-slate-100/50 italic text-sm text-slate-600 leading-relaxed">
                  "{e.feedbackFree}"
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
