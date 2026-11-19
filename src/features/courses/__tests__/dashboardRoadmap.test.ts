import { describe, expect, it } from 'vitest'
import {
  buildDashboardRoadmap,
  splitStepCaption,
  stripLeadingStepNumber,
} from '../dashboardRoadmap'
import type { CoursePath, LinkedCourse } from '../types'

const HR = 'hr-roadmap'
const KW = 'kw-roadmap'

function path(
  id: string,
  title: string,
  opts: { sections?: string[]; linked?: LinkedCourse } = {}
): CoursePath {
  return {
    id,
    title,
    description: null,
    sortOrder: 0,
    linkedCourse: opts.linked ?? null,
    materials: [],
    sections: (opts.sections ?? []).map((t, i) => ({
      id: `${id}-s${i}`,
      title: t,
      description: null,
      sortOrder: i,
      materials: [],
    })),
  }
}

const KNOWLEDGE_WORK: LinkedCourse = {
  id: KW,
  title: 'Lộ trình 5 cấp độ Lao động tri thức',
  isActive: true,
  paths: [
    { id: 'lv1', title: 'Cấp độ 1 - Tập sự' },
    { id: 'lv2', title: 'Cấp độ 2 - Biết việc' },
    { id: 'lv3', title: 'Cấp độ 3 - Được việc' },
    { id: 'lv4', title: 'Cấp độ 4 - Đóng góp kết quả' },
    { id: 'lv5', title: 'Cấp độ 5 - Tướng' },
  ],
}

describe('stripLeadingStepNumber', () => {
  it('drops a typed step number followed by a separator', () => {
    expect(stripLeadingStepNumber('1. Đào tạo Hội nhập')).toBe('Đào tạo Hội nhập')
    expect(stripLeadingStepNumber('  4) Lao động tri thức ')).toBe('Lao động tri thức')
    expect(stripLeadingStepNumber('2 - Đào tạo Phòng ban')).toBe('Đào tạo Phòng ban')
  })

  it('keeps titles that only start with or contain a number', () => {
    expect(stripLeadingStepNumber('5S tại văn phòng')).toBe('5S tại văn phòng')
    expect(stripLeadingStepNumber('Biết việc 0')).toBe('Biết việc 0')
    expect(stripLeadingStepNumber('Cấp độ 1 - Tập sự')).toBe('Cấp độ 1 - Tập sự')
  })

  it('keeps the original when nothing is left after the number', () => {
    expect(stripLeadingStepNumber('3.')).toBe('3.')
  })
})

describe('splitStepCaption', () => {
  it('moves a short numbered prefix into the caption', () => {
    expect(splitStepCaption('Cấp độ 1 - Tập sự')).toEqual({ title: 'Tập sự', caption: 'Cấp độ 1' })
    expect(splitStepCaption('Cấp độ 4 – Đóng góp kết quả')).toEqual({
      title: 'Đóng góp kết quả',
      caption: 'Cấp độ 4',
    })
    expect(splitStepCaption('Tuần 2: Làm quen công cụ')).toEqual({
      title: 'Làm quen công cụ',
      caption: 'Tuần 2',
    })
  })

  it('leaves titles without a numbered prefix alone (after stripping a step number)', () => {
    expect(splitStepCaption('1. Đào tạo Hội nhập')).toEqual({
      title: 'Đào tạo Hội nhập',
      caption: null,
    })
    expect(splitStepCaption('Biết việc 0')).toEqual({ title: 'Biết việc 0', caption: null })
    expect(splitStepCaption('Excel - nâng cao')).toEqual({
      title: 'Excel - nâng cao',
      caption: null,
    })
  })
})

describe('buildDashboardRoadmap', () => {
  it('expands a course linked to another roadmap into that roadmap’s courses, numbered on', () => {
    const { blocks, stepCount } = buildDashboardRoadmap({
      id: HR,
      paths: [
        path('p1', '1. Đào tạo Hội nhập'),
        path('p2', '2. Đào tạo Phòng ban'),
        path('p3', '3. Đào tạo Sản phẩm'),
        path('p4', '4. Lao động tri thức', { linked: KNOWLEDGE_WORK }),
      ],
    })

    expect(stepCount).toBe(8)
    expect(blocks[0]).toEqual({
      kind: 'step',
      step: {
        id: 'p1',
        number: 1,
        title: 'Đào tạo Hội nhập',
        caption: null,
        courseId: HR,
        pathId: 'p1',
      },
    })
    const group = blocks[3]
    expect(group).toMatchObject({ kind: 'group', id: 'p4', title: 'Lao động tri thức' })
    if (group?.kind !== 'group') throw new Error('expected a group')
    expect(group.steps.map((s) => [s.number, s.caption, s.title])).toEqual([
      [4, 'Cấp độ 1', 'Tập sự'],
      [5, 'Cấp độ 2', 'Biết việc'],
      [6, 'Cấp độ 3', 'Được việc'],
      [7, 'Cấp độ 4', 'Đóng góp kết quả'],
      [8, 'Cấp độ 5', 'Tướng'],
    ])
    // Bấm một cấp độ mở lộ trình liên kết, cuộn tới đúng khoá của cấp độ đó.
    expect(group.steps[0]).toMatchObject({ courseId: KW, pathId: 'lv1' })
  })

  it('uses sections as steps when a course is not linked', () => {
    const { blocks, stepCount } = buildDashboardRoadmap({
      id: HR,
      paths: [path('a', 'A', { sections: ['A1', 'A2'] }), path('b', 'B')],
    })
    expect(stepCount).toBe(3)
    expect(blocks[0]).toMatchObject({ kind: 'group', title: 'A' })
    if (blocks[0]?.kind !== 'group') throw new Error('expected a group')
    expect(blocks[0].steps[1]).toMatchObject({ number: 2, title: 'A2', courseId: HR, pathId: 'a' })
    expect(blocks[1]).toMatchObject({ kind: 'step', step: { number: 3, title: 'B', pathId: 'b' } })
  })

  it('falls back to a single step when the linked roadmap has no courses', () => {
    const { blocks, stepCount } = buildDashboardRoadmap({
      id: HR,
      paths: [path('p4', '4. Lao động tri thức', { linked: { ...KNOWLEDGE_WORK, paths: [] } })],
    })
    expect(stepCount).toBe(1)
    expect(blocks[0]).toMatchObject({ kind: 'step', step: { title: 'Lao động tri thức' } })
  })

  it('returns nothing for an empty roadmap', () => {
    expect(buildDashboardRoadmap({ id: HR, paths: [] })).toEqual({ blocks: [], stepCount: 0 })
  })
})
