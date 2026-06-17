import React, { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Save, Edit3, MessageSquare, ClipboardCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '@/lib/axios'

interface SessionEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  scheduleId: string
  userId: string
  userName: string
}

const QUESTIONS = [
  {
    id: 'q1',
    text: '1. Bạn đánh giá thế nào về cách dẫn dắt và chia sẻ của Host trong buổi đào tạo ngày hôm nay?',
  },
]

export function SessionEvaluationModal({
  open,
  onOpenChange,
  classId,
  scheduleId,
  userId,
  userName,
}: SessionEvaluationModalProps) {
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch, reset, control } = useForm({
    defaultValues: {
      q1: 5,
      feedbackLacking: '',
      feedbackImprove: '',
    },
  })

  const formValues = useWatch({ control })

  // Fetch existing evaluation
  const { data: existing, isLoading } = useQuery({
    queryKey: ['session-evaluation', scheduleId, userId],
    queryFn: async () => {
      const res = await apiClient.get<any>(
        `/class-evaluations/my-evaluation?scheduleId=${scheduleId}`
      )
      return res.data
    },
    enabled: open && !!scheduleId,
  })

  // Reset form khi chuyển sang buổi học khác hoặc khi có dữ liệu mới từ server
  useEffect(() => {
    if (existing) {
      reset({
        q1: existing.q1 ?? 5,
        feedbackLacking: existing.feedbackLacking || '',
        feedbackImprove: existing.feedbackImprove || '',
      })
    } else {
      // Nếu là đánh giá mới hoàn toàn (không có dữ liệu cũ trên server)
      reset({
        q1: 5,
        feedbackLacking: '',
        feedbackImprove: '',
      })
    }
  }, [existing, reset, scheduleId])

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/class-evaluations/submit', {
        classId,
        scheduleId,
        ...data,
      })
    },
    onSuccess: () => {
      toast.success('Đã lưu đánh giá buổi học')
      qc.invalidateQueries({ queryKey: ['session-evaluation', scheduleId, userId] })
      qc.invalidateQueries({ queryKey: ['learning'] })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) || 'Lỗi khi lưu đánh giá')
    },
  })

  const renderLikert = (name: string) => {
    const value = (formValues as any)[name] || 0
    const options = [
      {
        v: 1,
        label: '1: Rất không đồng ý',
        color: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100',
      },
      {
        v: 2,
        label: '2: Không đồng ý',
        color: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100',
      },
      {
        v: 3,
        label: '3: Trung lập',
        color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100',
      },
      {
        v: 4,
        label: '4: Đồng ý',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
      },
      {
        v: 5,
        label: '5: Hoàn toàn đồng ý',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100',
      },
    ]

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setValue(name as any, opt.v)}
            className={cn(
              'h-9 rounded-full border px-4 text-xs font-black uppercase tracking-tight transition-all',
              value === opt.v
                ? `${opt.color} border-current ring-2 ring-offset-1 ring-primary/10 scale-105 shadow-sm`
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[32px] border-0 p-0 shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between bg-white/95 p-8 backdrop-blur-xl border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">
                Đánh giá buổi học
              </DialogTitle>
              <p className="text-xs font-semibold text-slate-400">
                Học viên: <span className="text-primary">{userName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => submitMutation.mutate(data))}
          className="space-y-10 p-8 pt-2"
        >
          <div className="grid gap-4">
            {/* Numbered Questions 1-11 */}
            {QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/20 p-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/30"
              >
                <Label className="text-sm font-bold leading-relaxed text-slate-700">{q.text}</Label>
                {renderLikert(q.id)}
              </div>
            ))}

            {/* Numbered Free Text Questions 2-3 */}
            <div className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/20 p-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/30">
              <Label className="text-sm font-bold leading-relaxed text-slate-700">
                2. Nội dung của buổi đào tạo hôm nay có thể giúp ích gì cho bạn trong công việc và
                cuộc sống?
              </Label>
              <Textarea
                {...register('feedbackLacking')}
                placeholder="Nhập câu trả lời của bạn..."
                className="min-h-[120px] rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/20 p-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/30">
              <Label className="text-sm font-bold leading-relaxed text-slate-700">
                3. Bạn có góp ý gì để buổi đào tạo tiếp theo hiệu quả hơn?
              </Label>
              <Textarea
                {...register('feedbackImprove')}
                placeholder="Nhập câu trả lời của bạn..."
                className="min-h-[100px] rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-white/80 py-6 backdrop-blur-md">
            <Button
              type="submit"
              loading={submitMutation.isPending}
              className="h-14 w-full rounded-2xl bg-primary text-base font-black shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
            >
              {submitMutation.isPending ? (
                'Đang lưu...'
              ) : existing ? (
                <>
                  <Edit3 className="mr-2 h-5 w-5" /> Cập nhật đánh giá
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" /> Lưu đánh giá
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
