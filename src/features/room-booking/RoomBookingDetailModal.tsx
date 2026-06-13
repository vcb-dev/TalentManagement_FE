import { useState } from 'react'
import { Calendar, Clock, FileText, MapPin, User, X } from 'lucide-react'
import type { MeetingBooking } from './api'
import { getBookingDisplayStatus } from './roomBookingStatus'
import { formatDateLongVi, formatTimeRangeVi } from './roomBookingTimeUtils'
import { requiresMeetingMinutes } from './roomBookingMinutes'
import { RoomBookingMinutesCell } from './RoomBookingMinutesCell'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { cn } from '@/lib/utils'

type Props = {
  booking: MeetingBooking | null
  vnTime: { date: string; time: string }
  onClose: () => void
  onEdit: (booking: MeetingBooking) => void
  onDelete: (id: string) => void
  canManage: boolean
  currentUserId?: string
}

export function RoomBookingDetailModal({
  booking,
  vnTime,
  onClose,
  onEdit,
  onDelete,
  canManage,
  currentUserId,
}: Props) {
  if (!booking) return null

  const [activeCanvaIdx, setActiveCanvaIdx] = useState(0)

  const getCanvaEmbedUrl = (url: string): string | null => {
    const match = url.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/)
    if (match) {
      return `https://www.canva.com/design/${match[1]}/view?embed`
    }
    return null
  }

  const canvaDocs = booking.documents?.filter((doc) => getCanvaEmbedUrl(doc.url)) || []
  const hasCanva = canvaDocs.length > 0
  const activeCanvaDoc = canvaDocs[activeCanvaIdx]
  const embedUrl = activeCanvaDoc ? getCanvaEmbedUrl(activeCanvaDoc.url) : null

  const status = getBookingDisplayStatus(booking, vnTime)

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div
        className={cn(
          'relative w-full rounded-[2rem] border border-border/60 bg-card shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row',
          hasCanva ? 'max-w-4xl h-[min(90vh,680px)]' : 'max-w-md'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
        <div
          className={cn(
            'flex flex-col max-h-full overflow-y-auto',
            hasCanva ? 'w-full md:w-[360px] shrink-0 border-r border-border/40' : 'w-full'
          )}
        >
          {/* Header của lịch họp */}
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border/40 px-6 pb-4 pt-6 pr-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chi tiết lịch họp
              </p>
              <h2 className="mt-1 text-lg font-bold text-foreground line-clamp-2">
                {booking.reason}
              </h2>
              <span
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${status.className} ${status.pulse ? 'animate-pulse' : ''}`}
              >
                {status.pulse ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" /> : null}
                {status.text}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nội dung thông tin */}
          <div className="space-y-4 px-6 py-5">
            <DetailRow icon={User} label="Người đặt" value={booking.userName} />
            <DetailRow icon={MapPin} label="Phòng" value={booking.room} />
            <DetailRow icon={Calendar} label="Ngày" value={formatDateLongVi(booking.date)} />
            <DetailRow
              icon={Clock}
              label="Giờ"
              value={formatTimeRangeVi(booking.timeFrom, booking.timeTo)}
            />
            {booking.note?.trim() ? (
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Ghi chú</p>
                <p className="mt-1 text-sm text-foreground">{booking.note}</p>
              </div>
            ) : null}
            {booking.documents && booking.documents.length > 0 ? (
              <div className="rounded-xl border border-border/60 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase text-primary mb-2">
                  Tài liệu buổi họp ({booking.documents.length})
                </p>
                <div className="flex flex-col gap-2">
                  {booking.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={resolvePublicAssetUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 truncate text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-2 rounded-lg"
                      title={doc.name}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {requiresMeetingMinutes(booking, vnTime) ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Biên bản họp (BBH)
                </p>
                <div className="mt-2">
                  <RoomBookingMinutesCell
                    booking={booking}
                    vnTime={vnTime}
                    isOwner={booking.userId === currentUserId}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Các nút thao tác */}
          <div className="sticky bottom-0 z-10 bg-card/90 backdrop-blur-md border-t border-border/40 px-6 py-5 mt-auto">
            <div className="flex gap-3">
              {canManage ? (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(booking)}
                    className="flex-1 rounded-xl bg-primary/10 py-3 text-sm font-bold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Đổi lịch
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(booking.id)}
                    className="flex-1 rounded-xl bg-rose-50 py-3 text-sm font-bold uppercase tracking-wide text-rose-600 transition hover:bg-rose-600 hover:text-white"
                  >
                    Huỷ lịch
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/50"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: TRÌNH PHÁT CANVA */}
        {hasCanva && embedUrl && (
          <div className="flex-1 bg-muted/10 flex flex-col border-t md:border-t-0 md:border-l border-border/40 max-h-full overflow-hidden">
            {/* Header của cột slide */}
            <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between bg-card shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                  Trình phát slide
                </span>
                <h3
                  className="text-sm font-bold text-foreground truncate mt-0.5"
                  title={activeCanvaDoc?.name}
                >
                  {activeCanvaDoc?.name || 'Slide Canva'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolvePublicAssetUrl(activeCanvaDoc?.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all shrink-0"
                >
                  Mở Canva gốc
                </a>
              </div>
            </div>

            {/* Selector nếu có nhiều slide Canva */}
            {canvaDocs.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto bg-card px-4 py-2 border-b border-border/30 shrink-0">
                {canvaDocs.map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCanvaIdx(idx)}
                    className={cn(
                      'whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg transition-all',
                      activeCanvaIdx === idx
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Iframe Nhúng Slide */}
            <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
              <div className="relative w-full h-full rounded-2xl border border-border/60 bg-black/5 overflow-hidden shadow-lg group">
                <iframe
                  src={embedUrl}
                  loading="lazy"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                  allow="fullscreen"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
