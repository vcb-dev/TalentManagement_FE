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
              {/* Free Text Feedback */}
              <div className="space-y-6">
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
          <div className="space-y-5 divide-y divide-slate-100">
            {e.feedbackFree && (
              <div className="pt-2">
                <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-wider">
                  Dẫn dắt & chia sẻ của Host
                </p>
                <div className="rounded-2xl bg-white p-4 border border-slate-100/50 italic text-sm text-slate-600 leading-relaxed">
                  "{e.feedbackFree}"
                </div>
              </div>
            )}
            {e.feedbackLacking && (
              <div className="pt-5">
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
          </div>
        </div>
      </div>
    </div>
  )
}
