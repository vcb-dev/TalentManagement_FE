import { describe, expect, it } from 'vitest'
import { checklistResponsesToRows } from '../exportChecklistResponses'
import type { ChecklistTemplateResponses } from '../types'

const PERSON = { id: 'u1', fullNameLegal: 'Trần Văn A', email: 'a@vcb.vn' }

const DATA: ChecklistTemplateResponses = {
  template: {
    id: 't1',
    title: 'Checklist',
    description: null,
    kind: 'SELF',
    isActive: true,
    teams: [],
    responseCount: 1,
    createdAt: '2026-10-29T00:00:00.000Z',
    updatedAt: '2026-10-29T00:00:00.000Z',
    questions: [
      { id: 's1', type: 'SECTION', title: 'Đào tạo', description: null, required: false },
      {
        id: 'g1',
        type: 'GRID',
        title: 'Tình trạng',
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
      },
      { id: 'q1', type: 'SHORT_TEXT', title: 'Ghi chú', description: null, required: false },
    ],
  },
  rows: [
    {
      subject: {
        ...PERSON,
        employeeIdentifier: 'A001',
        teamName: 'ADS',
        teamLeader: null,
      },
      inScope: true,
      responses: [
        {
          id: 'resp1',
          respondent: PERSON,
          answers: { g1: { r2: 'c2' }, q1: 'ok' },
          createdAt: '2026-10-29T03:00:00.000Z',
          updatedAt: '2026-10-29T03:00:00.000Z',
        },
      ],
    },
  ],
}

describe('checklistResponsesToRows', () => {
  it('skips sections and splits a grid into one column per row', () => {
    const { header, rows } = checklistResponsesToRows(DATA)
    expect(header.slice(6)).toEqual(['Tình trạng [Hội nhập]', 'Tình trạng [Sản phẩm]', 'Ghi chú'])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.slice(0, 5)).toEqual(['1', 'A001', 'Trần Văn A', 'ADS', 'Tự điền'])
    expect(rows[0]!.slice(6)).toEqual(['', 'Chưa tham gia', 'ok'])
  })
})
