import { useState, useMemo, memo } from 'react'
import {
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  Filter,
  Paperclip,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { useManagerSubmissions, useUpdateSubmissionStatus } from '@/features/manager/hooks'
import { ManagerScreenLayout } from './ManagerScreenLayout'
import { formatViDate } from '@/lib/date'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ chấm',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/20',
  },
  GRADED: {
    label: 'Đã chấm',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-500/20',
  },
  ACCEPTED: {
    label: 'Đã đạt',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20',
  },
  REJECTED: {
    label: 'Không đạt',
    icon: AlertCircle,
    className: 'bg-rose-100 text-rose-700 ring-1 ring-rose-500/20',
  },
}

const LEVEL_LABELS: Record<string, string> = {
  tap_su: 'Tập sự',
  biet_viec: 'Biết việc',
  duoc_viec: 'Được việc',
  dong_gop_ket_qua: 'Đóng góp',
  tuong: 'Cấp tướng',
}

export function ManagerLearningSubmissionsScreen() {
  const { data: submissions, isLoading } = useManagerSubmissions()
  const updateStatus = useUpdateSubmissionStatus()
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    if (!submissions) return []
    const search = searchTerm.toLowerCase().trim()
    if (!search) return submissions

    return submissions.filter((s) => {
      return (
        (s.userName?.toLowerCase() || '').includes(search) ||
        (s.team?.toLowerCase() || '').includes(search) ||
        (s.topic?.toLowerCase() || '').includes(search) ||
        (s.objective?.toLowerCase() || '').includes(search)
      )
    })
  }, [submissions, searchTerm])

  const pendingCount = useMemo(
    () => (submissions ?? []).filter((s) => s.status === 'PENDING').length,
    [submissions]
  )

  const onDownload = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
    window.open(fullUrl, '_blank')
  }

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Duyệt minh chứng lộ trình</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>
              Quản lý và phê duyệt các bài phản tư, minh chứng học tập của nhân sự theo lộ trình 5
              cấp độ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm ring-1 ring-primary/10">
              <FileText className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
              {pendingCount} bài chờ duyệt
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, team hoặc nội dung bài nộp..."
              className="rounded-xl border-border bg-card pl-10 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl gap-2 border-border font-bold">
            <Filter className="h-4 w-4" />
            Lọc cấp độ
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-[24px]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-border bg-card/50 py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Không tìm thấy bài nộp nào</h3>
              <p className="text-muted-foreground">
                Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra sau.
              </p>
            </div>
          ) : (
            filtered.map((row, idx) => (
              <SubmissionCard
                key={row.id}
                row={row}
                idx={idx}
                onDownload={onDownload}
                updateStatus={updateStatus}
              />
            ))
          )}
        </div>
      </div>
    </ManagerScreenLayout>
  )
}

const SubmissionCard = memo(({ row, idx, onDownload, updateStatus }: any) => {
  const [score, setScore] = useState<string>(row.score?.toString() || '')
  const [comment, setComment] = useState<string>(row.managerComment || '')
  const status = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING
  const StatusIcon = status.icon

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[24px] border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:ring-1 hover:ring-primary/20',
        CARD_ENTRANCE_HOVER,
        row.status === 'PENDING' ? 'border-primary/20' : 'border-border'
      )}
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái: Thông tin Thành viên & Báo cáo (7/12) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col sm:flex-row gap-4">
          {/* Avatar */}
          <div className="relative shrink-0 hidden sm:block">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-lg font-black text-primary shadow-inner border border-primary/10">
              {row.userName.split(' ').pop()?.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1 shadow-sm">
              <div
                className={cn(
                  'h-3 w-3 rounded-full',
                  row.status === 'PENDING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                )}
              />
            </div>
          </div>

          {/* Chi tiết profile & nội dung */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                {row.userName}
              </h3>
              <span
                className={cn(
                  'rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm border',
                  status.className
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>

            {/* Tags thông tin */}
            <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Team</span>
                <span className="text-foreground font-black">{row.team || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Cấp độ</span>
                <span className="text-primary font-black">
                  {LEVEL_LABELS[row.level || ''] || row.level}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Ngày nộp</span>
                <span className="text-foreground font-black">{formatViDate(row.createdAt)}</span>
              </div>
              {row.score !== null && row.score !== undefined && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-emerald-50/80 border border-emerald-100 px-2.5 py-1 rounded-lg text-emerald-700">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-black">
                    Điểm số
                  </span>
                  <span className="font-black text-emerald-700 text-sm">{row.score}</span>
                </div>
              )}
            </div>

            {/* Báo cáo nộp bài (Tự động co gọn vừa mắt) */}
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/40 p-5 shadow-sm hover:bg-white hover:border-primary/20 transition-all duration-300">
              <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm break-all">
                  <Paperclip className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>{row.fileName || 'File minh chứng'}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 rounded-xl border-indigo-200/80 font-bold text-indigo-700 bg-white hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow transition-all duration-200"
                  onClick={() => onDownload(row.fileRef)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Xem minh chứng
                </Button>
              </div>

              <div className="space-y-2 border-t border-slate-200/40 pt-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 shrink-0">
                    Chủ đề:
                  </span>
                  <span className="text-sm font-extrabold text-gray-700 leading-relaxed">
                    {row.topic}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-500 line-clamp-3 bg-white/40 p-3 rounded-xl border border-slate-100">
                  {row.objective}
                </p>
              </div>

              {row.managerComment && row.status !== 'PENDING' && (
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-primary/70 mb-1 block">
                    Nhận xét của quản lý:
                  </span>
                  <p className="text-sm font-medium italic text-slate-700 bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed">
                    "{row.managerComment}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột Phải: Trình Điều Khiển Chấm Điểm & Nhận Xét (5/12) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full">
          {row.status === 'PENDING' ? (
            <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-[20px] border border-slate-200/60 p-5 shadow-sm">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-widest mb-0.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Đánh giá & Chấm điểm
              </div>

              <div className="space-y-3">
                <div className="relative shadow-sm">
                  <input
                    type="number"
                    placeholder="Nhập điểm số (Ví dụ: 85)..."
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 bg-white font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm placeholder:text-slate-400"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    ĐIỂM
                  </span>
                </div>

                <div className="relative shadow-sm">
                  <textarea
                    placeholder="Nhận xét chi tiết về năng lực & bài nộp của nhân sự..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full min-h-[100px] p-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-slate-400 resize-y"
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl bg-primary font-bold text-white hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                onClick={() =>
                  updateStatus.mutate({
                    id: row.id,
                    status: 'GRADED',
                    score: score ? parseInt(score) : undefined,
                    managerComment: comment,
                  })
                }
                disabled={updateStatus.isPending || !score}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Hoàn tất chấm điểm</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl p-6 bg-slate-50/30">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Đã hoàn tất xử lý
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
