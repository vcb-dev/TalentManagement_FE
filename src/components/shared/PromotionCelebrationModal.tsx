/**
 * PromotionCelebrationModal — Modal chúc mừng thăng cấp.
 * Hiển thị khi user mới được thăng cấp (level-up) và vào trang tổng quan.
 * Kèm pháo hoa + animation đẹp.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Crown, Sparkles, Star, TrendingUp, X } from 'lucide-react'
import { ConfettiCelebration } from '@/components/shared/ConfettiCelebration'
import { Button } from '@/components/ui/button'
import { LEVEL_LABELS, type LevelCode } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface PromotionCelebrationModalProps {
  /** Level trước (null nếu chưa có) */
  fromLevel: LevelCode | null
  /** Level mới */
  toLevel: LevelCode
  /** Tên hiển thị */
  displayName: string
  /** Ngày thăng cấp */
  promotedAt?: string
  /** Preview lộ trình sao tiếp theo */
  nextStarTopics?: Array<{ topic: string; objectives: string[] }>
  /** Callback khi đóng modal */
  onDismiss: () => void
}

const LEVEL_THEME: Record<
  string,
  { gradient: string; glow: string; icon: typeof Crown; accent: string }
> = {
  biet_viec: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    glow: 'shadow-[0_0_80px_20px_rgba(16,185,129,0.3)]',
    icon: Star,
    accent: 'text-emerald-400',
  },
  duoc_viec: {
    gradient: 'from-blue-400 via-indigo-500 to-purple-600',
    glow: 'shadow-[0_0_80px_20px_rgba(99,102,241,0.3)]',
    icon: TrendingUp,
    accent: 'text-indigo-400',
  },
  dong_gop_ket_qua: {
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    glow: 'shadow-[0_0_80px_20px_rgba(245,158,11,0.3)]',
    icon: Sparkles,
    accent: 'text-amber-400',
  },
  tuong: {
    gradient: 'from-yellow-300 via-amber-400 to-yellow-600',
    glow: 'shadow-[0_0_100px_30px_rgba(251,191,36,0.4)]',
    icon: Crown,
    accent: 'text-yellow-400',
  },
}

const DEFAULT_THEME = {
  gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
  glow: 'shadow-[0_0_80px_20px_rgba(16,185,129,0.3)]',
  icon: Star,
  accent: 'text-emerald-400',
}

export function PromotionCelebrationModal({
  fromLevel,
  toLevel,
  displayName,
  promotedAt,
  nextStarTopics,
  onDismiss,
}: PromotionCelebrationModalProps) {
  const [visible, setVisible] = useState(false)
  const [fireConfetti, setFireConfetti] = useState(false)

  const theme = LEVEL_THEME[toLevel] ?? DEFAULT_THEME
  const LevelIcon = theme.icon
  const fromLabel = fromLevel ? LEVEL_LABELS[fromLevel] : '—'
  const toLabel = LEVEL_LABELS[toLevel] ?? toLevel

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setVisible(true), 50)
    // Trigger confetti after modal appears
    const confettiTimer = setTimeout(() => setFireConfetti(true), 300)
    return () => {
      clearTimeout(timer)
      clearTimeout(confettiTimer)
    }
  }, [])

  // TỰ ĐỘNG PHÁT GIỌNG NÓI CHÚC MỪNG SIÊU TRUYỀN CẢM, THƯỚT THA NHẸ NHÀNG
  useEffect(() => {
    if (!window.speechSynthesis) return

    const speakCongratulation = () => {
      window.speechSynthesis.cancel()

      const message = `Chúc mừng ${displayName} đã xuất sắc thăng cấp thành công lên trình độ ${toLabel}`
      const msg = new SpeechSynthesisUtterance(message)

      const voices = window.speechSynthesis.getVoices()

      // Ưu tiên giọng đỉnh cao:
      // 1. Hoài My (Microsoft Edge Neural - Nữ nhẹ nhàng thướt tha số 1 thế giới)
      // 2. Linh (Apple iOS/macOS Premium - Rất dịu dàng tự nhiên)
      // 3. Các giọng Việt Nam chất lượng cao khác
      const optimalVoice =
        voices.find((v) => v.name.includes('HoaiMy') || v.voiceURI.includes('HoaiMy')) ||
        voices.find((v) => v.name.includes('Linh')) ||
        voices.find(
          (v) =>
            (v.lang.includes('vi') || v.lang.includes('VN')) &&
            (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Premium'))
        ) ||
        voices.find((v) => v.lang.includes('vi') || v.lang.includes('VN'))

      if (optimalVoice) {
        msg.voice = optimalVoice
      }
      msg.lang = 'vi-VN'

      // TỐI ƯU THÔNG SỐ ĐỂ THÀNH GIỌNG "THƯỚT THA, NHẸ NHÀNG":
      msg.rate = 0.82 // Đọc chậm rãi, từ tốn, trang trọng (mặc định 1.0 là quá nhanh, robot)
      msg.pitch = 1.06 // Tông cao hơn xíu tạo độ ngọt ngào, thân thiện
      msg.volume = 0.95

      window.speechSynthesis.speak(msg)
    }

    // Để hiệu ứng pháo hoa nổ đẹp đẽ 1.2 giây trước khi cất tiếng nói cho sang trọng
    const tSpeak = setTimeout(() => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        speakCongratulation()
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          speakCongratulation()
          window.speechSynthesis.onvoiceschanged = null
        }
      }
    }, 1200)

    return () => {
      clearTimeout(tSpeak)
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [displayName, toLabel])

  const handleClose = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel() // Tắt giọng nói ngay khi bấm đóng
    }
    setVisible(false)
    setTimeout(onDismiss, 350)
  }, [onDismiss])

  const formattedDate = useMemo(() => {
    if (!promotedAt) return null
    try {
      return new Date(promotedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }, [promotedAt])

  return createPortal(
    <>
      <ConfettiCelebration trigger={fireConfetti} variant="grand" />

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500',
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        )}
      >
        <div
          className={cn(
            'relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900',
            theme.glow
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className={cn('h-1.5 w-full bg-gradient-to-r', theme.gradient)} />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-5 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="px-5 pb-6 pt-5 text-center">
            {/* Glowing icon */}
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <div
                className={cn(
                  'absolute inset-0 animate-pulse rounded-full bg-gradient-to-r opacity-30 blur-xl',
                  theme.gradient
                )}
              />
              <div
                className={cn(
                  'relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-2xl',
                  theme.gradient
                )}
              >
                <LevelIcon className="h-9 w-9 text-white drop-shadow-lg" strokeWidth={1.75} />
              </div>
              {/* Orbiting sparkles */}
              <div className="absolute -right-1 -top-1 animate-bounce">
                <Sparkles className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
              </div>
              <div
                className="absolute -bottom-1 -left-1 animate-bounce"
                style={{ animationDelay: '0.3s' }}
              >
                <Sparkles className="h-4 w-4 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
              </div>
            </div>

            {/* Celebration text */}
            <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.25em] text-yellow-400/80">
              🎉 Chúc mừng 🎉
            </p>
            <h2 className="mb-1 text-xl font-black text-white">{displayName}</h2>
            <p className="mb-4 text-xs font-medium text-white/70">Đã thăng cấp thành công!</p>

            {/* Level transition */}
            <div className="mx-auto mb-5 flex items-center justify-center gap-2">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Từ</p>
                <p className="mt-0.5 text-xs font-bold text-white/60">{fromLabel}</p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5">
                <TrendingUp className={cn('h-4 w-4', theme.accent)} />
              </div>

              <div
                className={cn(
                  'rounded-lg border px-3 py-2 backdrop-blur',
                  'border-white/20 bg-gradient-to-br from-white/10 to-white/5'
                )}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Lên</p>
                <p className={cn('mt-0.5 text-xs font-black', theme.accent)}>{toLabel}</p>
              </div>
            </div>

            {formattedDate && (
              <p className="mb-4 text-xs text-white/40">Ngày thăng cấp: {formattedDate}</p>
            )}

            {/* Roadmap Preview */}
            {nextStarTopics && nextStarTopics.length > 0 && (
              <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-3.5 text-left backdrop-blur">
                <div className="mb-2.5 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-white/60" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Lộ trình học tiếp theo
                  </p>
                </div>
                <div className="space-y-2">
                  {nextStarTopics.map((item, idx) => (
                    <div key={idx}>
                      <p className={cn('text-xs font-bold', theme.accent)}>{item.topic}</p>
                      {item.objectives.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {item.objectives.slice(0, 2).map((obj, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-white/60">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                              {obj}
                            </li>
                          ))}
                          {item.objectives.length > 2 && (
                            <li className="text-xs text-white/40">
                              +{item.objectives.length - 2} mục khác
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <Button
              onClick={handleClose}
              className={cn(
                'h-12 w-full rounded-2xl bg-gradient-to-r text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-95',
                theme.gradient
              )}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Tuyệt vời! Tiếp tục nào
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
