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
import { apiClient } from '@/lib/axios'
import { isMockApiEnabled } from '@/lib/mockEnv'

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

/** Sao / emoji trong tên có thể làm TTS “kẹt” hoặc đọc sai — chỉ giữ phần tên chính */
function cleanDisplayNameForSpeech(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return ''
  const beforeSuffix = trimmed.split(/\s+[—\-–]\s*/)[0] ?? trimmed
  return beforeSuffix.trim().replace(/\s+/g, ' ')
}

async function ensureSpeechVoices(timeoutMs = 1800): Promise<SpeechSynthesisVoice[]> {
  const syn = window.speechSynthesis
  const current = syn.getVoices()
  if (current.length > 0) return current

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      syn.removeEventListener('voiceschanged', onReady)
      resolve(syn.getVoices())
    }
    const onReady = () => finish()
    syn.addEventListener('voiceschanged', onReady)
    window.setTimeout(finish, timeoutMs)
  })
}

function pickVietnameseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const vi = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('vi') ||
      /vietnamese|viet.?nam/i.test(`${v.name} ${v.voiceURI ?? ''}`)
  )
  if (vi.length === 0) return undefined

  /** Ưu tiên Việt Neural / Edge / Apple — hạn chế giọng Google tiếng Việt mặc định của Chrome khi có lựa chọn khác. */
  const score = (v: SpeechSynthesisVoice) => {
    const n = `${v.name} ${v.voiceURI ?? ''}`.toLowerCase()
    let s = 0
    if (n.includes('hoaimy') || n.includes('hoài my') || n.includes('hoai my')) s += 110
    if (n.includes('namminh') || n.includes('nam minh')) s += 105
    if (n.includes('microsoft') && (n.includes('neural') || n.includes('online'))) s += 95
    if (n.includes('microsoft') && /vi|viet/.test(n)) s += 70
    if (n.includes('com.apple') && (n.includes('premium') || n.includes('enhanced'))) s += 88
    if (n.includes('com.apple') && /vi|viet|linh/.test(n)) s += 65
    if (n.includes('samsung') && /vi|viet/.test(n)) s += 55
    if (/(neural|natural|premium|enhanced|wavnet)/.test(n)) s += 45
    if (n.includes('edge') && /vi|viet/.test(n)) s += 40
    if (n.includes('google') && /vi|vietnamese|viet/.test(n)) s -= 50
    if (n.includes('google') && !/vi|vietnamese|viet/.test(n)) s -= 80
    return s
  }

  return [...vi].sort((a, b) => score(b) - score(a))[0]
}

/** MP3 từ ElevenLabs qua backend (nếu đang phát) — revoke khi đóng modal hoặc kết thúc. */
let promotionCloudObjectUrl: string | null = null
let promotionCloudAudio: HTMLAudioElement | null = null

export function cancelPromotionCongratsPlayback(): void {
  if (typeof window === 'undefined') return
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  if (promotionCloudAudio) {
    promotionCloudAudio.pause()
    promotionCloudAudio = null
  }
  if (promotionCloudObjectUrl) {
    URL.revokeObjectURL(promotionCloudObjectUrl)
    promotionCloudObjectUrl = null
  }
}

function speakPromotionViaBrowser(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const run = async () => {
    const syn = window.speechSynthesis
    syn.cancel()
    try {
      syn.resume()
    } catch {
      /* ignore */
    }

    const voices = await ensureSpeechVoices()
    const u = new SpeechSynthesisUtterance(text)

    const v = pickVietnameseVoice(voices)
    if (v) u.voice = v
    u.lang = 'vi-VN'
    u.rate = 0.92
    u.pitch = 1.08
    u.volume = 1

    syn.speak(u)
  }

  void run()
}

async function tryPlayCloudPromotionTts(text: string): Promise<boolean> {
  try {
    const res = await apiClient.post<ArrayBuffer>(
      '/tts/promotion',
      { text },
      {
        responseType: 'arraybuffer',
        timeout: 45_000,
      }
    )
    const buf = res.data as ArrayBuffer
    /** Backend có thể trả audio/mpeg, application/octet-stream; Safari đôi khi không có content-type trong CORS subset. Chỉ cần 200 + nhị phân đủ dài là coi là MP3. */
    const len = buf?.byteLength ?? 0
    if (len < 256) {
      return false
    }
    const ct = String(res.headers['content-type'] ?? '').toLowerCase()
    if (len < 4096 && (ct.includes('json') || ct.includes('text/plain'))) {
      return false
    }

    const blob = new Blob([buf], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    cancelPromotionCongratsPlayback()
    promotionCloudObjectUrl = url
    const audio = new Audio(url)
    promotionCloudAudio = audio
    audio.onended = () => {
      cancelPromotionCongratsPlayback()
    }
    try {
      await audio.play()
    } catch {
      cancelPromotionCongratsPlayback()
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Ưu tiên **ElevenLabs** (MP3 qua BE `POST /tts/promotion`); nếu thiếu cấu hình hoặc lỗi thì dùng Web Speech.
 */
export function speakPromotionCongrats(params: {
  displayName: string
  /** Cùng cấp ⇒ coi là mốc thăng sao (nhánh STAR_UP của manager). */
  fromLevel: LevelCode | null
  toLevel: LevelCode
  toLabel: string
}) {
  if (typeof window === 'undefined') return

  const { displayName, fromLevel, toLevel, toLabel } = params
  const rawName = cleanDisplayNameForSpeech(displayName)
  const name = rawName || 'đồng nghiệp'

  const isStarMilestone = fromLevel != null && fromLevel === toLevel

  const text = isStarMilestone
    ? `Xin chúc mừng ${name}. Bạn vừa đạt mốc sao tiếp theo tại trình độ ${toLabel}. Rất đáng tự hào, chúc bạn luôn thành công.`
    : `Xin chúc mừng ${name}. Thật ấn tượng, bạn đã thăng cấp thành công lên trình độ ${toLabel}. Mong bạn tiếp tục phát triển.`

  const run = async () => {
    cancelPromotionCongratsPlayback()

    if (!isMockApiEnabled()) {
      const ok = await tryPlayCloudPromotionTts(text)
      if (ok) return
    }

    speakPromotionViaBrowser(text)
  }

  void run()
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

  /** Tự động đọc khi modal mở (ElevenLabs hoặc trình duyệt; autoplay có thể bị chặn đến khi user thao tác tab). */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = window.setTimeout(() => {
      speakPromotionCongrats({ displayName, fromLevel, toLevel, toLabel })
    }, 650)
    return () => {
      window.clearTimeout(t)
      cancelPromotionCongratsPlayback()
    }
  }, [displayName, fromLevel, toLevel, toLabel])

  const handleClose = useCallback(() => {
    cancelPromotionCongratsPlayback()
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
              type="button"
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
