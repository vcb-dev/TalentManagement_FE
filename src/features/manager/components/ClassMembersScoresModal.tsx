import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useManagerSubmissions } from '@/features/exam/hooks'
import { Loader2, User, Trophy, Calendar, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassMembersScoresModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  className?: string
}

export function ClassMembersScoresModal({
  isOpen,
  onClose,
  classId,
  className,
}: ClassMembersScoresModalProps) {
  const { data: allSubmissions = [], isLoading } = useManagerSubmissions()
  const [searchTerm, setSearchTerm] = useState('')

  const classSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.classId === classId),
    [allSubmissions, classId]
  )

  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return classSubmissions
    return classSubmissions.filter((s) => s.fullName.toLowerCase().includes(q))
  }, [classSubmissions, searchTerm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-primary/10 via-white to-transparent px-8 pt-8 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Thành viên & Điểm số
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Danh sách học viên và kết quả thi của lớp
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          {/* Search Bar inside Header */}
          <div className="relative mt-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Tìm kiếm theo tên học viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-11 pr-10 rounded-xl border-slate-200 bg-white/50 focus:bg-white transition-all shadow-sm focus:ring-primary/10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="p-2">
          <div className="h-[400px] overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-medium">
                  {searchTerm
                    ? 'Không tìm thấy học viên phù hợp.'
                    : 'Lớp này chưa có dữ liệu bài nộp.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 leading-none mb-1.5">
                          {sub.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleDateString('vi-VN')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">
                          Điểm số
                        </p>
                        <p
                          className={cn(
                            'text-xl font-black tracking-tighter tabular-nums',
                            sub.totalScore >= 90
                              ? 'text-emerald-600'
                              : sub.totalScore >= 40
                                ? 'text-primary'
                                : 'text-rose-500'
                          )}
                        >
                          {sub.totalScore}%
                        </p>
                      </div>
                      <Badge
                        variant={sub.status === 'done' ? 'default' : 'secondary'}
                        className={cn(
                          'rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter',
                          sub.status === 'done'
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none'
                            : ''
                        )}
                      >
                        {sub.status === 'done' ? 'Đã chấm' : 'Chưa chấm'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-end items-center gap-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-auto">
            Hiển thị: {filteredSubmissions.length} / {classSubmissions.length} học viên
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
          >
            Đóng
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
