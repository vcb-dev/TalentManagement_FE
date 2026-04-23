import { useState } from 'react'
import {
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Filter,
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
import { Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ duyệt',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/20',
  },
  ACCEPTED: {
    label: 'Đã duyệt',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20',
  },
  REJECTED: {
    label: 'Từ chối',
    icon: XCircle,
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

  const filtered = (submissions ?? []).filter((s) => {
    const search = searchTerm.toLowerCase()
    return (
      s.userName.toLowerCase().includes(search) ||
      s.team?.toLowerCase().includes(search) ||
      s.topic.toLowerCase().includes(search) ||
      s.objective.toLowerCase().includes(search)
    )
  })

  const pendingCount = (submissions ?? []).filter((s) => s.status === 'PENDING').length

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
            filtered.map((row, idx) => {
              const status = STATUS_CONFIG[row.status]
              const StatusIcon = status.icon

              return (
                <div
                  key={row.id}
                  className={cn(
                    'group relative overflow-hidden rounded-[24px] border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:ring-1 hover:ring-primary/20',
                    CARD_ENTRANCE_HOVER,
                    row.status === 'PENDING' ? 'border-primary/20' : 'border-border'
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-lg font-black text-primary shadow-inner">
                        {row.userName.split(' ').pop()?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1 shadow-sm">
                        <div
                          className={cn(
                            'h-3 w-3 rounded-full',
                            row.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                          {row.userName}
                        </h3>
                        <span
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                            status.className
                          )}
                        >
                          <StatusIcon className="mr-1 inline-flex h-3 w-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400">
                            Team
                          </span>
                          <span className="text-foreground">{row.team || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400">
                            Cấp độ
                          </span>
                          <span className="text-primary">
                            {LEVEL_LABELS[row.level || ''] || row.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400">
                            Ngày nộp
                          </span>
                          <span>{formatViDate(row.createdAt)}</span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-tighter text-primary/60">
                            Chủ đề:
                          </span>
                          <span className="text-sm font-extrabold text-primary-700">
                            {row.topic}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground line-clamp-2">
                          {row.objective}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full min-w-[180px] shrink-0 flex-col gap-3 self-center md:w-auto">
                      <Button
                        variant="outline"
                        className="h-12 w-full gap-2 rounded-xl border-primary/20 font-extrabold text-primary hover:bg-primary/5"
                        onClick={() => onDownload(row.fileRef)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Xem minh chứng
                      </Button>
                      {row.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-12 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700 disabled:opacity-50"
                            onClick={() => updateStatus.mutate({ id: row.id, status: 'ACCEPTED' })}
                            disabled={updateStatus.isPending}
                          >
                            {updateStatus.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              'Duyệt'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            className="flex-1 h-12 rounded-xl font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' })}
                            disabled={updateStatus.isPending}
                          >
                            {updateStatus.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              'Từ chối'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </ManagerScreenLayout>
  )
}
