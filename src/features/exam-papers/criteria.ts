import type { z } from 'zod'
import type { essayCriteriaWeightsSchema } from './schemas'

export type EssayCriteriaWeights = z.infer<typeof essayCriteriaWeightsSchema>
export type EssayCriteriaId = keyof EssayCriteriaWeights

/**
 * Thang điểm đánh giá câu tự luận — text tiêu chí fix cứng toàn hệ thống,
 * chỉ giá trị % là chỉnh được khi soạn đề (tổng luôn phải bằng 100).
 */
export const ESSAY_CRITERIA: Array<{ id: EssayCriteriaId; label: string; desc: string }> = [
  {
    id: 'ly_thuyet',
    label: 'Đúng lý thuyết',
    desc: 'Trình bày chính xác, đầy đủ kiến thức chuyên môn liên quan.',
  },
  {
    id: 'thuc_te',
    label: 'Ví dụ thực tế',
    desc: 'Có ví dụ minh họa cụ thể, sát với thực tiễn công việc tại VCB.',
  },
  {
    id: 'trinh_bay',
    label: 'Trình bày',
    desc: 'Cách trình bày mạch lạc, rõ ràng, dễ hiểu và chuyên nghiệp.',
  },
]

export const DEFAULT_ESSAY_CRITERIA_WEIGHTS: EssayCriteriaWeights = {
  ly_thuyet: 40,
  thuc_te: 50,
  trinh_bay: 10,
}

export function sumCriteriaWeights(weights: EssayCriteriaWeights): number {
  return ESSAY_CRITERIA.reduce((sum, c) => sum + (weights[c.id] || 0), 0)
}
