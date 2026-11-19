import { describe, expect, it } from 'vitest'
import {
  buildDashboardRoadmap,
  splitStepCaption,
  stripLeadingStepNumber,
} from '../dashboardRoadmap'
import type { CoursePath, LinkedCourse } from '../types'

const HR = 'hr-roadmap'

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
  id: 'kw-roadmap',
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
  it('shows each course as one step — a linked course stays a single general step', () => {
    const steps = buildDashboardRoadmap({
      id: HR,
      paths: [
        path('p1', '1. Đào tạo Hội nhập'),
        path('p2', '2. Đào tạo Phòng ban'),
        path('p3', '3. Đào tạo Sản phẩm'),
        path('p4', '4. Lao động tri thức', { linked: KNOWLEDGE_WORK }),
      ],
    })

    expect(steps.map((s) => [s.number, s.title])).toEqual([
      [1, 'Đào tạo Hội nhập'],
      [2, 'Đào tạo Phòng ban'],
      [3, 'Đào tạo Sản phẩm'],
      [4, 'Lao động tri thức'],
    ])
    expect(steps[0]).toEqual({
      id: 'p1',
      number: 1,
      title: 'Đào tạo Hội nhập',
      caption: null,
      courseId: HR,
      pathId: 'p1',
    })
    // Bước 4 mở khoá "Lao động tri thức" ngay trong lộ trình này, không nhảy sang lộ trình 5 cấp độ.
    expect(steps[3]).toMatchObject({ courseId: HR, pathId: 'p4' })
  })

  it('does not expand sections into steps', () => {
    const steps = buildDashboardRoadmap({
      id: HR,
      paths: [path('a', 'A', { sections: ['A1', 'A2'] }), path('b', 'B')],
    })
    expect(steps.map((s) => [s.number, s.title, s.pathId])).toEqual([
      [1, 'A', 'a'],
      [2, 'B', 'b'],
    ])
  })

  it('returns nothing for an empty roadmap', () => {
    expect(buildDashboardRoadmap({ id: HR, paths: [] })).toEqual([])
  })
})
