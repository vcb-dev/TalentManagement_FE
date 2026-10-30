import { describe, expect, it } from 'vitest'
import {
  checklistQuestionNumbers,
  cleanChecklistAnswers,
  countChecklistQuestions,
  formatChecklistAnswer,
  missingRequiredQuestions,
  validateChecklistTemplate,
} from '../checklistAnswers'
import type { ChecklistQuestion, ChecklistTemplateInput } from '../types'

const SINGLE: ChecklistQuestion = {
  id: 'q1',
  type: 'SINGLE_CHOICE',
  title: 'Đã nhận đồng phục?',
  description: null,
  required: true,
  options: [
    { id: 'o1', label: 'Rồi' },
    { id: 'o2', label: 'Chưa' },
  ],
}
const MULTI: ChecklistQuestion = { ...SINGLE, id: 'q2', type: 'MULTIPLE_CHOICE', required: false }
const NOTE: ChecklistQuestion = {
  id: 'q3',
  type: 'SHORT_TEXT',
  title: 'Ghi chú',
  description: null,
  required: false,
}
const SCALE: ChecklistQuestion = {
  id: 'q4',
  type: 'SCALE',
  title: 'Mức độ',
  description: null,
  required: false,
  scale: { min: 1, max: 5, minLabel: null, maxLabel: null },
}
const DATE: ChecklistQuestion = { ...NOTE, id: 'q5', type: 'DATE', title: 'Ngày' }

describe('checklist answers', () => {
  it('lists required questions that are still blank', () => {
    expect(missingRequiredQuestions([SINGLE, NOTE], { q3: 'x' })).toEqual([SINGLE])
    expect(missingRequiredQuestions([SINGLE], { q1: 'o1' })).toEqual([])
  })

  it('drops blank and unknown answers before saving', () => {
    expect(
      cleanChecklistAnswers([SINGLE, MULTI, NOTE], {
        q1: 'o1',
        q2: [],
        q3: '  ghi chú  ',
        gone: 'x',
      })
    ).toEqual({ q1: 'o1', q3: 'ghi chú' })
  })

  it('formats answers for display and export', () => {
    expect(formatChecklistAnswer(SINGLE, 'o2')).toBe('Chưa')
    expect(formatChecklistAnswer(MULTI, ['o1', 'old'])).toBe('Rồi, (lựa chọn đã xoá)')
    expect(formatChecklistAnswer(SCALE, 4)).toBe('4 / 5')
    expect(formatChecklistAnswer(DATE, '2026-10-29')).toBe('29/10/2026')
    expect(formatChecklistAnswer(NOTE, undefined)).toBe('')
  })
})

describe('validateChecklistTemplate', () => {
  const base: ChecklistTemplateInput = {
    title: 'Checklist hội nhập',
    description: null,
    kind: 'SELF',
    teamIds: [],
    questions: [SINGLE],
  }

  it('accepts a valid template', () => {
    expect(validateChecklistTemplate(base)).toBeNull()
  })

  it('rejects missing title, no questions, blank or duplicate options', () => {
    expect(validateChecklistTemplate({ ...base, title: ' ' })).toBe('Nhập tên checklist')
    expect(validateChecklistTemplate({ ...base, questions: [] })).toBe(
      'Checklist cần ít nhất 1 câu hỏi'
    )
    expect(
      validateChecklistTemplate({
        ...base,
        questions: [{ ...SINGLE, options: [{ id: 'a', label: ' ' }] }],
      })
    ).toBe('Câu 1: có lựa chọn đang để trống')
    expect(
      validateChecklistTemplate({
        ...base,
        questions: [
          {
            ...SINGLE,
            options: [
              { id: 'a', label: 'Có' },
              { id: 'b', label: 'có' },
            ],
          },
        ],
      })
    ).toBe('Câu 1: lựa chọn "có" bị trùng')
  })
})

describe('section & grid', () => {
  const SECTION: ChecklistQuestion = {
    id: 's1',
    type: 'SECTION',
    title: 'Đào tạo',
    description: null,
    required: false,
  }
  const GRID: ChecklistQuestion = {
    id: 'g1',
    type: 'GRID',
    title: 'Tình trạng đào tạo',
    description: null,
    required: true,
    rows: [
      { id: 'r1', label: 'Hội nhập' },
      { id: 'r2', label: 'Sản phẩm' },
    ],
    options: [
      { id: 'c1', label: 'Đã hoàn thành' },
      { id: 'c2', label: 'Chưa tham gia' },
    ],
  }

  it('numbers questions without counting sections', () => {
    expect([...checklistQuestionNumbers([SECTION, SINGLE, SECTION, GRID])]).toEqual([
      ['q1', 1],
      ['g1', 2],
    ])
    expect(countChecklistQuestions([SECTION, GRID])).toBe(1)
  })

  it('requires every row of a required grid and never a section', () => {
    expect(missingRequiredQuestions([SECTION, GRID], { g1: { r1: 'c1' } })).toEqual([GRID])
    expect(missingRequiredQuestions([SECTION, GRID], { g1: { r1: 'c1', r2: 'c2' } })).toEqual([])
  })

  it('cleans grid answers, drops section answers and formats grids per row', () => {
    expect(
      cleanChecklistAnswers([SECTION, GRID], { s1: 'x', g1: { r1: 'c1', r2: '', r9: 'c1' } })
    ).toEqual({ g1: { r1: 'c1' } })
    expect(formatChecklistAnswer(GRID, { r1: 'c1', r2: 'c2' })).toBe(
      'Hội nhập: Đã hoàn thành\nSản phẩm: Chưa tham gia'
    )
  })

  it('validates grid rows / columns and needs at least one real question', () => {
    const base: ChecklistTemplateInput = {
      title: 'x',
      description: null,
      kind: 'SELF',
      teamIds: [],
      questions: [SECTION, GRID],
    }
    expect(validateChecklistTemplate(base)).toBeNull()
    expect(validateChecklistTemplate({ ...base, questions: [SECTION] })).toBe(
      'Checklist cần ít nhất 1 câu hỏi'
    )
    expect(
      validateChecklistTemplate({ ...base, questions: [SECTION, { ...GRID, rows: [] }] })
    ).toBe('Câu 1: cần ít nhất 1 dòng')
    expect(
      validateChecklistTemplate({ ...base, questions: [{ ...SECTION, title: ' ' }, GRID] })
    ).toBe('Tiêu đề phần 1: nhập tên phần')
  })
})
