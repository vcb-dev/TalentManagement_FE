import { describe, expect, it } from 'vitest'
import { buildCourseFilterOptions, matchesCourseFilter } from '../classCourseFilter'

const kt = { id: 'c-kt', title: 'Lao động tri thức' }
const sp = { id: 'c-sp', title: 'Đào tạo Sản phẩm' }
const p1 = { id: 'p-1', title: 'Từ Tập sự đến Biết việc' }
const p2 = { id: 'p-2', title: 'Từ Biết việc đến Được việc' }

const legacy = { course: null, coursePath: null }
const ktWhole = { course: kt, coursePath: null }
const ktP1 = { course: kt, coursePath: p1 }

describe('matchesCourseFilter', () => {
  it('shows every class without a course filter', () => {
    expect([legacy, ktWhole, ktP1].every((r) => matchesCourseFilter(r, {}))).toBe(true)
  })

  it('"none" keeps only classes without a course', () => {
    expect(matchesCourseFilter(legacy, { course: 'none' })).toBe(true)
    expect(matchesCourseFilter(ktWhole, { course: 'none' })).toBe(false)
  })

  it('filters by course, then by path or whole-course classes', () => {
    expect(matchesCourseFilter(ktP1, { course: kt.id })).toBe(true)
    expect(matchesCourseFilter(ktP1, { course: sp.id })).toBe(false)
    expect(matchesCourseFilter(ktP1, { course: kt.id, path: p1.id })).toBe(true)
    expect(matchesCourseFilter(ktWhole, { course: kt.id, path: p1.id })).toBe(false)
    expect(matchesCourseFilter(ktWhole, { course: kt.id, path: 'whole' })).toBe(true)
    expect(matchesCourseFilter(ktP1, { course: kt.id, path: 'whole' })).toBe(false)
  })
})

describe('buildCourseFilterOptions', () => {
  it('keeps course/path order from the course page and counts classes', () => {
    const { courses, noneCount } = buildCourseFilterOptions(
      [legacy, legacy, ktWhole, ktP1, ktP1],
      [
        { ...kt, paths: [p1, p2] },
        { ...sp, paths: [] },
      ]
    )
    expect(noneCount).toBe(2)
    expect(courses.map((c) => [c.id, c.count, c.wholeCount])).toEqual([
      ['c-kt', 3, 1],
      ['c-sp', 0, 0],
    ])
    expect(courses[0]!.paths.map((p) => [p.id, p.count])).toEqual([
      ['p-1', 2],
      ['p-2', 0],
    ])
  })

  it('adds courses and paths only known from classes (hidden course) at the end', () => {
    const { courses } = buildCourseFilterOptions([ktP1], [{ ...sp, paths: [] }])
    expect(courses.map((c) => c.title)).toEqual(['Đào tạo Sản phẩm', 'Lao động tri thức'])
    expect(courses[1]!.paths).toEqual([{ ...p1, count: 1 }])
  })
})
