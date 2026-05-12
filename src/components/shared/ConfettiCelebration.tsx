/**
 * ConfettiCelebration — Pháo hoa toàn màn hình khi thăng cấp.
 * Sử dụng canvas-confetti cho hiệu ứng nhẹ, mượt, không DOM overhead.
 */
import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

/** Bắn pháo hoa rực rỡ — gọi trực tiếp bất cứ đâu */
export function fireConfetti() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }
    const particleCount = 50 * (timeLeft / duration)

    // Bắn từ 2 bên
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7'],
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7'],
    })
  }, 250)
}

/** Bắn pháo hoa kiểu "đại lễ" — nhiều hơn, lâu hơn */
export function fireGrandConfetti() {
  const count = 200
  const defaults = { origin: { y: 0.7 }, zIndex: 99999 }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55, colors: ['#FFD700', '#FFA500'] })
  fire(0.2, { spread: 60, colors: ['#FF6B6B', '#E74C3C'] })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#4ECDC4', '#2ECC71'] })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#6C5CE7', '#A29BFE'],
  })
  fire(0.1, { spread: 120, startVelocity: 45, colors: ['#FDCB6E', '#F39C12'] })

  // Bắn thêm đợt 2 sau 400ms
  setTimeout(() => {
    fire(0.25, { spread: 26, startVelocity: 55, origin: { y: 0.5 }, colors: ['#FFD700'] })
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      origin: { y: 0.5 },
      colors: ['#4ECDC4', '#45B7D1'],
    })
  }, 400)
}

interface ConfettiCelebrationProps {
  /** Khi `trigger` chuyển thành true, bắn pháo hoa 1 lần */
  trigger: boolean
  /** Kiểu pháo hoa: 'normal' (nhẹ) hoặc 'grand' (đại lễ) */
  variant?: 'normal' | 'grand'
  /** Callback khi animation kết thúc */
  onComplete?: () => void
}

/**
 * Component bắn pháo hoa khi `trigger === true`.
 * Render null (không DOM overhead), chỉ gọi canvas-confetti.
 */
export function ConfettiCelebration({
  trigger,
  variant = 'grand',
  onComplete,
}: ConfettiCelebrationProps) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (!trigger || hasFired.current) return
    hasFired.current = true

    if (variant === 'grand') {
      fireGrandConfetti()
    } else {
      fireConfetti()
    }

    const timeout = setTimeout(() => {
      onComplete?.()
    }, 3500)

    return () => clearTimeout(timeout)
  }, [trigger, variant, onComplete])

  // Reset khi trigger trở lại false
  useEffect(() => {
    if (!trigger) {
      hasFired.current = false
    }
  }, [trigger])

  return null // Không cần DOM
}
