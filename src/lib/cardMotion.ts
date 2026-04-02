import type { CSSProperties } from 'react'

/** Chỉ animation vào (không hover) — dùng khi component đã có hover riêng (vd. EmployeeCard) */
export const CARD_ENTRANCE =
  'motion-safe:opacity-0 motion-safe:animate-[profile-card-in_0.55s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none'

/**
 * Card / panel: vào trang (fade + trượt nhẹ) + hover nâng — dùng chung toàn app.
 * Keyframes: `profile-card-in` trong index.css
 */
export const CARD_ENTRANCE_HOVER = [
  CARD_ENTRANCE,
  'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/25',
].join(' ')

/** Chỉ hover (không animation vào) — list/table ô cần phản hồi nhanh */
export const CARD_HOVER =
  'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/20'

/** Strip / section title — fade-up ngắn */
export const SECTION_FADE_UP =
  'motion-safe:animate-[dash-fade-up_0.55s_ease-out_both] motion-reduce:animate-none motion-reduce:opacity-100'

/** Thanh tiến độ fill từ trái — keyframes `profile-progress-fill` */
export const PROGRESS_BAR_FILL =
  'origin-left motion-safe:animate-[profile-progress-fill_0.95s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none'

/** Sao pop lần lượt — keyframes `dash-star-pop` */
export const STAR_POP = 'motion-safe:animate-[dash-star-pop_0.42s_ease-out_both] motion-reduce:animate-none'

export const STAR_HOVER =
  'transition-transform duration-200 ease-out will-change-transform hover:z-10 hover:scale-125 hover:rotate-12'

export function staggerStyle(index: number, stepMs = 65): CSSProperties {
  return { animationDelay: `${index * stepMs}ms` }
}

/** @deprecated dùng CARD_ENTRANCE_HOVER — giữ cho import cũ MyProfile */
export const PROFILE_CARD_MOTION = CARD_ENTRANCE_HOVER
