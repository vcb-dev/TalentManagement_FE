/** Điểm / hạng demo ổn định theo chuỗi (vd. email) — thay bằng API khi có. */
export function demoGamificationFromSeed(seed: string): { points: number; rank: number } {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
  }
  const points = 800 + Math.abs(h % 4200)
  const rank = 1 + Math.abs((h >> 8) % 199)
  return { points, rank }
}
