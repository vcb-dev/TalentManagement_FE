import { describe, expect, it } from 'vitest'
import {
  byCountDesc,
  countUpdatedSince,
  prefersColumns,
  wrapChartLabel,
  filterOverviewRows,
  OVERVIEW_NONE,
  overviewGroups,
  overviewRows,
  overviewSections,
  REMOVED_OPTION_ID,
  startFilterLabel,
  startMonthCounts,
  startYears,
  type OverviewFilter,
} from '../checklistOverview'
import type {
  AdminChecklistSubject,
  ChecklistAnswers,
  ChecklistQuestion,
  ChecklistResponse,
  ChecklistTemplateResponses,
} from '../types'

const LEADER = { id: 'l1', fullNameLegal: 'Trưởng nhóm A', email: null }

function subject(
  id: string,
  teamName: string | null,
  teamLeader = LEADER,
  startDateWork: string | null = null
): AdminChecklistSubject {
  return {
    id,
    fullNameLegal: id,
    email: null,
    employeeIdentifier: null,
    teamName,
    teamLeader,
    startDateWork,
  }
}

function response(
  id: string,
  answers: ChecklistAnswers,
  updatedAt = '2026-10-30T00:00:00.000Z'
): ChecklistResponse {
  return { id, respondent: LEADER, answers, createdAt: updatedAt, updatedAt }
}

const QUESTIONS: ChecklistQuestion[] = [
  {
    id: 'single',
    type: 'SINGLE_CHOICE',
    title: 'Mức độ',
    description: null,
    required: true,
    options: [
      { id: 'a', label: 'Đạt' },
      { id: 'b', label: 'Chưa đạt' },
    ],
  },
  { id: 's1', type: 'SECTION', title: 'Phần 1', description: 'Mô tả', required: false },
  {
    id: 'multi',
    type: 'MULTIPLE_CHOICE',
    title: 'Đã nắm',
    description: null,
    required: false,
    options: [
      { id: 'x', label: 'Quy trình' },
      { id: 'y', label: 'Công cụ' },
    ],
  },
  {
    id: 'grid',
    type: 'GRID',
    title: 'Đào tạo',
    description: null,
    required: true,
    rows: [
      { id: 'r1', label: 'Hội nhập' },
      { id: 'r2', label: 'Sản phẩm' },
    ],
    options: [
      { id: 'done', label: 'Xong' },
      { id: 'todo', label: 'Chưa' },
    ],
  },
  {
    id: 'scale',
    type: 'SCALE',
    title: 'Điểm',
    description: null,
    required: false,
    scale: { min: 1, max: 3, minLabel: 'Kém', maxLabel: 'Tốt' },
  },
  { id: 'text', type: 'LONG_TEXT', title: 'Nhận xét', description: null, required: false },
  { id: 's2', type: 'SECTION', title: 'Phần trống', description: null, required: false },
]

function data(
  rows: ChecklistTemplateResponses['rows'],
  isActive = true
): ChecklistTemplateResponses {
  return {
    template: {
      id: 't1',
      title: 'Checklist',
      description: null,
      kind: 'LEADER',
      isActive,
      questions: QUESTIONS,
      teams: [],
      responseCount: 0,
      createdAt: '2026-10-29T00:00:00.000Z',
      updatedAt: '2026-10-29T00:00:00.000Z',
    },
    rows,
  }
}

describe('overviewRows', () => {
  it('mẫu đang dùng: chỉ nhân sự thuộc team áp dụng, lấy bản sửa gần nhất', () => {
    const rows = overviewRows(
      data([
        {
          subject: subject('u1', 'ADS'),
          inScope: true,
          responses: [
            response('old', { single: 'b' }, '2026-10-01T00:00:00.000Z'),
            response('new', { single: 'a' }, '2026-10-20T00:00:00.000Z'),
          ],
        },
        { subject: subject('u2', 'ADS'), inScope: true, responses: [] },
        {
          subject: subject('u3', 'SALE'),
          inScope: false,
          responses: [response('r3', { single: 'a' })],
        },
      ])
    )
    expect(rows.map((r) => [r.subject.id, r.response?.id ?? null])).toEqual([
      ['u1', 'new'],
      ['u2', null],
    ])
  })

  it('mẫu đã ngừng: chỉ người đã có câu trả lời', () => {
    const rows = overviewRows(
      data(
        [
          { subject: subject('u1', 'ADS'), inScope: false, responses: [response('r1', {})] },
          { subject: subject('u2', 'ADS'), inScope: false, responses: [] },
        ],
        false
      )
    )
    expect(rows.map((r) => r.subject.id)).toEqual(['u1'])
  })
})

describe('lọc & tiến độ', () => {
  const rows = [
    { subject: subject('u1', 'ADS'), response: response('r1', {}) },
    { subject: subject('u2', 'ADS'), response: null },
    { subject: subject('u3', null, null as never), response: response('r3', {}) },
  ]

  it('lọc theo team / trưởng nhóm, kể cả "chưa có"', () => {
    expect(
      filterOverviewRows(rows, { team: 'ADS', leader: null }).map((r) => r.subject.id)
    ).toEqual(['u1', 'u2'])
    expect(
      filterOverviewRows(rows, { team: OVERVIEW_NONE, leader: null }).map((r) => r.subject.id)
    ).toEqual(['u3'])
    expect(
      filterOverviewRows(rows, { team: null, leader: OVERVIEW_NONE }).map((r) => r.subject.id)
    ).toEqual(['u3'])
  })

  it('lọc theo tháng / năm vào làm, mỗi ô lọc độc lập; người thiếu ngày vào làm bị loại', () => {
    const byStart = [
      { subject: subject('oct26', 'ADS', LEADER, '2026-10-21'), response: null },
      { subject: subject('oct25', 'ADS', LEADER, '2025-10-02'), response: null },
      { subject: subject('sep26', 'SALE', LEADER, '2026-09-30'), response: null },
      { subject: subject('none', 'SALE', LEADER, null), response: null },
    ]
    const ids = (f: Partial<OverviewFilter>) =>
      filterOverviewRows(byStart, { team: null, leader: null, ...f }).map((r) => r.subject.id)
    expect(ids({ startMonth: 10, startYear: 2026 })).toEqual(['oct26'])
    expect(ids({ startMonth: 10 })).toEqual(['oct26', 'oct25'])
    expect(ids({ startYear: 2026 })).toEqual(['oct26', 'sep26'])
    expect(ids({ startYear: 2026, team: 'SALE' })).toEqual(['sep26'])
    expect(ids({})).toHaveLength(4)
    expect(startYears(byStart)).toEqual([2026, 2025])
    expect(startMonthCounts(byStart, 2026).slice(8, 10)).toEqual([1, 1])
    expect(startMonthCounts(byStart, null)[9]).toBe(2)
    expect(startMonthCounts(byStart, 2024).every((n) => n === 0)).toBe(true)
  })

  it('nhãn ô lọc vào làm', () => {
    expect(startFilterLabel(null, null)).toBe('Mọi thời gian')
    expect(startFilterLabel(4, 2026)).toBe('Tháng 4/2026')
    expect(startFilterLabel(null, 2026)).toBe('Năm 2026')
    expect(startFilterLabel(4, null)).toBe('Tháng 4 (mọi năm)')
  })

  it('nhóm có tỷ lệ điền thấp nhất xếp trước', () => {
    expect(overviewGroups(rows, 'team')).toEqual([
      { key: 'ADS', label: 'ADS', total: 2, done: 1 },
      { key: OVERVIEW_NONE, label: 'Chưa có team', total: 1, done: 1 },
    ])
  })

  it('đếm bản cập nhật trong N ngày', () => {
    expect(countUpdatedSince(rows, 7, new Date('2026-11-02T00:00:00.000Z'))).toBe(2)
    expect(countUpdatedSince(rows, 1, new Date('2026-11-02T00:00:00.000Z'))).toBe(0)
  })
})

describe('overviewSections', () => {
  const rows = [
    {
      subject: subject('u1', 'ADS'),
      response: response('r1', {
        single: 'a',
        multi: ['x', 'y'],
        grid: { r1: 'done', r2: 'todo' },
        scale: 3,
        text: 'Tốt',
      }),
    },
    {
      subject: subject('u2', 'ADS'),
      response: response('r2', {
        single: 'gone',
        multi: ['x'],
        grid: { r1: 'done' },
        scale: 1,
      }),
    },
    { subject: subject('u3', 'ADS'), response: response('r3', {}) },
    { subject: subject('u4', 'ADS'), response: null },
  ]
  const sections = overviewSections(QUESTIONS, rows)

  it('chia theo tiêu đề phần, bỏ phần trống, đánh số câu bỏ qua tiêu đề phần', () => {
    expect(sections.map((s) => [s.id, s.title, s.stats.map((st) => st.number)])).toEqual([
      ['__intro', null, [1]],
      ['s1', 'Phần 1', [2, 3, 4, 5]],
    ])
  })

  it('chọn một: đếm từng lựa chọn, lựa chọn đã xoá và người bỏ trống', () => {
    const st = sections[0]!.stats[0]!
    if (st.kind !== 'choice') throw new Error('kind')
    expect(st.options.map((o) => [o.id, o.count, o.subjectIds])).toEqual([
      ['a', 1, ['u1']],
      ['b', 0, []],
      [REMOVED_OPTION_ID, 1, ['u2']],
    ])
    expect(st.answered).toBe(2)
    expect(st.skippedIds).toEqual(['u3'])
  })

  it('chọn nhiều: mỗi lựa chọn đếm riêng', () => {
    const st = sections[1]!.stats[0]!
    if (st.kind !== 'choice') throw new Error('kind')
    expect(st.multiple).toBe(true)
    expect(st.options.map((o) => o.count)).toEqual([2, 1])
    expect(st.answered).toBe(2)
  })

  it('lưới: đếm theo từng dòng', () => {
    const st = sections[1]!.stats[1]!
    if (st.kind !== 'grid') throw new Error('kind')
    expect(st.rows.map((r) => [r.id, r.answered, r.options.map((o) => o.count)])).toEqual([
      ['r1', 2, [2, 0]],
      ['r2', 1, [0, 1]],
    ])
  })

  it('thang điểm: đếm từng mức + điểm trung bình', () => {
    const st = sections[1]!.stats[2]!
    if (st.kind !== 'scale') throw new Error('kind')
    expect(st.options.map((o) => [o.label, o.count])).toEqual([
      ['1 · Kém', 1],
      ['2', 0],
      ['3 · Tốt', 1],
    ])
    expect(st.average).toBe(2)
  })

  it('thang điểm bị sửa hẹp lại: điểm ngoài thang gom riêng, không tính vào điểm trung bình', () => {
    const [section] = overviewSections(
      [QUESTIONS.find((q) => q.id === 'scale')!],
      [
        { subject: subject('u1', 'ADS'), response: response('r1', { scale: 3 }) },
        { subject: subject('u2', 'ADS'), response: response('r2', { scale: 8 }) },
        { subject: subject('u3', 'ADS'), response: response('r3', { scale: 1 }) },
      ]
    )
    const st = section!.stats[0]!
    if (st.kind !== 'scale') throw new Error('kind')
    expect(st.options.map((o) => [o.id, o.count])).toEqual([
      ['1', 1],
      ['2', 0],
      ['3', 1],
      [REMOVED_OPTION_ID, 1],
    ])
    expect(st.options.at(-1)!.subjectIds).toEqual(['u2'])
    expect([st.answered, st.scored, st.average]).toEqual([3, 2, 2])
  })

  it('tự luận: chỉ đếm người trả lời', () => {
    const st = sections[1]!.stats[3]!
    expect(st).toMatchObject({ kind: 'text', answered: 1, subjectIds: ['u1'] })
  })

  it('tự luận: người trả lời xếp bản sửa gần nhất trước', () => {
    const [section] = overviewSections(
      [QUESTIONS.find((q) => q.id === 'text')!],
      [
        { subject: subject('u1', 'ADS'), response: response('r1', { text: 'A' }, '2026-10-01') },
        { subject: subject('u2', 'ADS'), response: response('r2', { text: 'B' }, '2026-10-20') },
        { subject: subject('u3', 'ADS'), response: response('r3', {}, '2026-10-25') },
        { subject: subject('u4', 'ADS'), response: response('r4', { text: 'D' }, '2026-10-10') },
      ]
    )
    expect(section!.stats[0]).toMatchObject({ answered: 3, subjectIds: ['u2', 'u4', 'u1'] })
  })
})

describe('biểu đồ', () => {
  it('ngắt nhãn trục theo từ, quá số dòng thì thêm …', () => {
    expect(wrapChartLabel('Thiết bị/Phụ kiện khác', 12, 3)).toEqual(['Thiết bị/Phụ', 'kiện khác'])
    expect(wrapChartLabel('Công việc và trách nhiệm của vị trí', 10, 2)).toEqual([
      'Công việc',
      'và trách…',
    ])
  })

  it('cột dọc khi 3–5 đáp án, 1–2 hoặc nhiều hơn thì cột ngang; thang điểm từ 3 mức luôn cột dọc', () => {
    const options = (n: number) => Array.from({ length: n }, (_, i) => i)
    expect(prefersColumns({ kind: 'choice', options: options(1) })).toBe(false)
    expect(prefersColumns({ kind: 'choice', options: options(2) })).toBe(false)
    expect(prefersColumns({ kind: 'choice', options: options(3) })).toBe(true)
    expect(prefersColumns({ kind: 'choice', options: options(5) })).toBe(true)
    expect(prefersColumns({ kind: 'choice', options: options(6) })).toBe(false)
    expect(prefersColumns({ kind: 'scale', options: options(2) })).toBe(false)
    expect(prefersColumns({ kind: 'scale', options: options(3) })).toBe(true)
    expect(prefersColumns({ kind: 'scale', options: options(11) })).toBe(true)
  })

  it('xếp lựa chọn theo số người giảm dần, bằng nhau giữ thứ tự form', () => {
    const items = [
      { id: 'a', count: 2 },
      { id: 'b', count: 5 },
      { id: 'c', count: 2 },
      { id: 'd', count: 0 },
    ]
    expect(byCountDesc(items).map((x) => x.id)).toEqual(['b', 'a', 'c', 'd'])
    expect(items.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
