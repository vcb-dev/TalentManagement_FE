import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2, Upload } from 'lucide-react'
import type { MeetingBooking } from './api'
import { uploadMeetingMinutes } from './api'
import {
  getMinutesStatus,
  getMinutesStatusLabel,
  requiresMeetingMinutes,
} from './roomBookingMinutes'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { cn } from '@/lib/utils'

const ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type Props = {
  booking: MeetingBooking
  vnTime: { date: string; time: string }
  compact?: boolean
  isOwner?: boolean
}

export function RoomBookingMinutesCell({ booking, vnTime, compact, isOwner }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [localError, setLocalError] = useState<string | null>(null)
  const status = getMinutesStatus(booking, vnTime)
  const canUpload = isOwner && requiresMeetingMinutes(booking, vnTime)

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadMeetingMinutes(booking.id, file),
    onSuccess: () => {
      setLocalError(null)
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] })
    },
    onError: (err: Error) => {
      setLocalError(err.message || 'Tải file thất bại')
    },
  })

  if (status === 'not_required') {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const badgeClass =
    status === 'submitted'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className={cn('flex flex-col gap-1.5', compact && 'items-start')}>
      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          badgeClass
        )}
      >
        {getMinutesStatusLabel(status)}
      </span>

      {status === 'submitted' && booking.minutesFileUrl ? (
        <a
          href={resolvePublicAssetUrl(booking.minutesFileUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 truncate text-xs font-semibold text-primary hover:underline"
          title={booking.minutesFileName ?? 'Tải biên bản'}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{booking.minutesFileName ?? 'Tải file'}</span>
        </a>
      ) : null}

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 20 * 1024 * 1024) {
                setLocalError('File tối đa 20MB')
                return
              }
              uploadMut.mutate(file)
            }}
          />
          <button
            type="button"
            disabled={uploadMut.isPending}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {uploadMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {status === 'submitted' ? 'Đổi file BBH' : 'Tải BBH lên'}
          </button>
        </>
      ) : null}

      {localError ? <p className="text-[10px] text-rose-600">{localError}</p> : null}
    </div>
  )
}
