import { describe, expect, it } from 'vitest'
import {
  countCourseMaterials,
  countPathMaterials,
  decodeMaterialTarget,
  encodeMaterialTarget,
} from '../courseContent'
import type { CourseDetail, CourseMaterial, CoursePath } from '../types'

function material(id: string): CourseMaterial {
  return {
    id,
    pathId: null,
    sectionId: null,
    title: id,
    url: 'https://example.com',
    fileRef: null,
    fileName: null,
    note: null,
    sortOrder: 0,
  }
}

function path(id: string, own: number, perSection: number[]): CoursePath {
  return {
    id,
    title: id,
    description: null,
    sortOrder: 0,
    linkedCourse: null,
    materials: Array.from({ length: own }, (_, i) => material(`${id}-m${i}`)),
    sections: perSection.map((n, j) => ({
      id: `${id}-s${j}`,
      title: `${id}-s${j}`,
      description: null,
      sortOrder: j,
      materials: Array.from({ length: n }, (_, i) => material(`${id}-s${j}-m${i}`)),
    })),
  }
}

describe('encode/decodeMaterialTarget', () => {
  it('round-trips the three levels', () => {
    for (const target of [
      { pathId: null, sectionId: null },
      { pathId: 'p1', sectionId: null },
      { pathId: null, sectionId: 's1' },
    ]) {
      expect(decodeMaterialTarget(encodeMaterialTarget(target))).toEqual(target)
    }
  })

  it('encodes a section even when its course (path) id is known', () => {
    expect(encodeMaterialTarget({ pathId: 'p1', sectionId: 's1' })).toBe('section:s1')
  })

  it('treats unknown values as the roadmap-level group', () => {
    expect(decodeMaterialTarget('')).toEqual({ pathId: null, sectionId: null })
  })
})

describe('material counts', () => {
  it('counts course-level and section materials of a course (path)', () => {
    expect(countPathMaterials(path('p', 2, [1, 0, 3]))).toBe(6)
    expect(countPathMaterials(path('p', 0, []))).toBe(0)
  })

  it('counts every level of a roadmap', () => {
    const course: CourseDetail = {
      id: 'c',
      title: 'c',
      description: null,
      isActive: true,
      sortOrder: 0,
      updatedAt: '2026-11-19T00:00:00.000Z',
      materials: [material('shared')],
      paths: [path('p1', 1, [2]), path('p2', 0, [])],
    }
    expect(countCourseMaterials(course)).toBe(4)
  })
})
