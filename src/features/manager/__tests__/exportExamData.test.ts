import { describe, expect, it } from 'vitest'
import {
  buildExamExportSheets,
  examScheduleStats,
  excelDateTime,
  rowHeightFor,
  type ExamExportInfo,
  type ExamExportSchedule,
  type ExportSheet,
} from '../exportExamData'

const headersOf = (sheet: ExportSheet | undefined) => sheet?.columns.map((c) => c.header) ?? []

const exam: ExamExportInfo = {
  scheduleId: 's1',
  className: 'Lớp Văn Hóa 10',
  topic: 'Kỳ thi năng lực',
  dateIso: '2026-11-02',
  startTime: '08:00',
  endTime: '10:00',
  durationMinutes: 120,
  statusLabel: 'Đã kết thúc',
  location: null,
  graderName: 'Lê Thu Hằng',
  paperCodes: 'VH01',
  passScoreLabel: '80',
}

function submission(
  overrides: Partial<NonNullable<ExamExportSchedule['students'][number]['submission']>>
) {
  return {
    id: 'sub',
    status: 'done' as const,
    createdAt: '2026-11-02T01:05:00.000Z',
    updatedAt: '2026-11-02T03:00:00.000Z',
    paperCode: 'VH01',
    paperTitle: 'Đề văn hoá',
    passScore: 80,
    totalScore: 90,
    outcome: 'DAT' as const,
    graderName: 'Lê Thu Hằng',
    gradedAt: '2026-11-03T02:00:00.000Z',
    graderNote: 'Tốt',
    fileName: null,
    fileUrl: null,
    studentFeedback: null,
    questions: [],
    ...overrides,
  }
}

const result: ExamExportSchedule = {
  scheduleId: 's1',
  classTeacherName: 'Lê Thu Hằng',
  courseTitle: 'Văn hoá VCB',
  coursePathTitle: null,
  memberCount: 3,
  students: [
    {
      userId: 'u1',
      employeeIdentifier: 'A500',
      fullName: 'An',
      email: 'an@x.vn',
      teamName: 'Global',
      isMember: true,
      submission: submission({
        questions: [
          {
            order: 1,
            stem: 'WBS là gì?',
            type: 'mcq',
            answer: 'Sơ đồ',
            score: 1,
            maxScore: 1,
            correctAnswer: 'Sơ đồ',
            isCorrect: true,
            criteria: [],
            note: '',
          },
          {
            order: 2,
            stem: '',
            type: 'essay',
            answer: 'Bài cũ',
            score: 70,
            maxScore: 100,
            correctAnswer: null,
            isCorrect: null,
            criteria: ['ly_thuyet', 'trinh_bay'],
            note: 'Ổn',
          },
        ],
      }),
    },
    {
      userId: 'u2',
      employeeIdentifier: null,
      fullName: 'Bình',
      email: null,
      teamName: null,
      isMember: true,
      submission: submission({
        id: 'sub2',
        totalScore: 40,
        outcome: 'CHO_HOC_LAI',
        fileName: 'bai.pdf',
        fileUrl: 'https://x/bai.pdf',
      }),
    },
    {
      userId: 'u3',
      employeeIdentifier: 'A501',
      fullName: 'Cường',
      email: null,
      teamName: null,
      isMember: true,
      submission: null,
    },
    {
      userId: 'u4',
      employeeIdentifier: null,
      fullName: 'Dũng',
      email: null,
      teamName: null,
      isMember: false,
      submission: submission({ id: 'sub4', status: 'pending', totalScore: null, outcome: null }),
    },
  ],
}

describe('examScheduleStats', () => {
  it('đếm nộp / chấm / đạt và điểm TB trên bài đã chấm', () => {
    expect(examScheduleStats(result.students)).toEqual({
      students: 4,
      submitted: 3,
      notSubmitted: 1,
      graded: 2,
      average: 65,
      max: 90,
      min: 40,
      passed: 1,
      notPassed: 1,
      passRate: 0.5,
    })
    expect(examScheduleStats().average).toBeNull()
  })
})

describe('buildExamExportSheets', () => {
  const [examSheet, scoreSheet, questionSheet] = buildExamExportSheets([exam], [result])

  it('sheet Kỳ thi: một dòng mỗi kỳ thi kèm khoá học và thống kê', () => {
    expect(examSheet?.rows).toHaveLength(1)
    const row = examSheet?.rows[0] ?? []
    const header = headersOf(examSheet)
    const col = (h: string) => row[header.indexOf(h)]
    expect(col('Khoá học')).toBe('Văn hoá VCB')
    expect(col('Lộ trình')).toBe('Cả khoá học')
    expect(col('Ngày thi')).toEqual(new Date(Date.UTC(2026, 10, 2)))
    expect(col('Chờ chấm')).toBe(1)
    expect(col('Tỉ lệ đạt')).toBe(0.5)
    expect(col('Ngưỡng đạt')).toBe('80')
    expect(row).toHaveLength(header.length)
  })

  it('sheet Kỳ thi có dòng tổng cộng, khớp số cột', () => {
    const header = headersOf(examSheet)
    const totals = examSheet?.totals ?? []
    expect(totals).toHaveLength(header.length)
    expect(totals[header.indexOf('Lớp')]).toBe('Tổng 1 kỳ thi')
    expect(totals[header.indexOf('Sĩ số lớp')]).toBe(3)
    expect(totals[header.indexOf('Đã nộp')]).toBe(3)
    expect(totals[header.indexOf('Điểm TB (%)')]).toBe(65)
  })

  it('để trống Đạt / Chưa đạt khi chưa chấm bài nào', () => {
    const [sheet] = buildExamExportSheets([exam], [{ ...result, students: [result.students[2]!] }])
    const header = headersOf(sheet)
    expect(sheet?.rows[0]?.[header.indexOf('Đạt')]).toBeNull()
    expect(sheet?.rows[0]?.[header.indexOf('Chưa đạt')]).toBeNull()
  })

  it('sheet Điểm thi: cả người chưa làm bài, link file, kết quả tiếng Việt', () => {
    const header = headersOf(scoreSheet)
    const rows = scoreSheet?.rows ?? []
    const col = (r: number, h: string) => rows[r]?.[header.indexOf(h)]
    expect(rows).toHaveLength(4)
    expect(col(0, 'Kết quả')).toBe('Đạt')
    expect(col(1, 'Kết quả')).toBe('Chờ học lại')
    expect(col(1, 'File bài làm')).toEqual({ text: 'bai.pdf', hyperlink: 'https://x/bai.pdf' })
    expect(col(2, 'Trạng thái bài')).toBe('Chưa làm bài')
    expect(col(2, 'Điểm (%)')).toBeNull()
    expect(col(3, 'Còn trong lớp')).toBe('Không')
    expect(col(3, 'Trạng thái bài')).toBe('Chờ chấm')
    expect(rows.every((r) => r.length === header.length)).toBe(true)
    expect(scoreSheet?.rowGroups).toEqual([0, 0, 0, 0])
  })

  it('sheet Chi tiết từng câu: nhãn loại câu, đúng/sai, tiêu chí', () => {
    const header = headersOf(questionSheet)
    const rows = questionSheet?.rows ?? []
    const col = (r: number, h: string) => rows[r]?.[header.indexOf(h)]
    expect(rows).toHaveLength(2)
    expect(col(0, 'Loại câu')).toBe('Trắc nghiệm')
    expect(col(0, 'Đúng / Sai')).toBe('Đúng')
    expect(col(1, 'Nội dung câu hỏi')).toBe('(Câu không còn trong đề)')
    expect(col(1, 'Tiêu chí đạt')).toBe('Đúng lý thuyết, Trình bày')
    expect(col(1, 'Đúng / Sai')).toBe('')
    expect(col(0, 'Trạng thái bài')).toBe('Đã chấm')
    expect(rows.every((r) => r.length === header.length)).toBe(true)
    expect(questionSheet?.rowGroups).toEqual([1, 1])
  })

  it('câu trắc nghiệm bỏ trống ghi "Bỏ trống" thay vì "Sai"', () => {
    const blankMcq = {
      ...result.students[0]!,
      submission: submission({
        status: 'started',
        questions: [
          {
            order: 1,
            stem: 'WBS là gì?',
            type: 'mcq' as const,
            answer: '',
            score: null,
            maxScore: 1,
            correctAnswer: 'Sơ đồ',
            isCorrect: false,
            criteria: [],
            note: '',
          },
        ],
      }),
    }
    const [, , sheet] = buildExamExportSheets([exam], [{ ...result, students: [blankMcq] }])
    const row = sheet?.rows[0] ?? []
    const header = headersOf(sheet)
    expect(row[header.indexOf('Đúng / Sai')]).toBe('Bỏ trống')
    expect(row[header.indexOf('Trạng thái bài')]).toBe('Đang làm dở')
  })

  it('cắt bớt ô quá dài để file Excel không hỏng', () => {
    const long = 'a'.repeat(40_000)
    const [, sheet] = buildExamExportSheets(
      [exam],
      [
        {
          ...result,
          students: [{ ...result.students[0]!, submission: submission({ graderNote: long }) }],
        },
      ]
    )
    const note = sheet?.rows[0]?.[headersOf(sheet).indexOf('Nhận xét của người chấm')]
    expect(typeof note === 'string' && note.length < 32_767).toBe(true)
  })
})

describe('định dạng ô', () => {
  it('ngày giờ giữ đúng giờ địa phương khi ghi ra Excel', () => {
    const local = new Date(2026, 10, 2, 8, 5)
    expect(excelDateTime(local.toISOString())).toEqual(new Date(Date.UTC(2026, 10, 2, 8, 5)))
    expect(excelDateTime(null)).toBeNull()
  })

  it('dòng có bài làm dài bị giới hạn chiều cao, dòng ngắn giữ tối thiểu', () => {
    const columns = [
      { header: 'Tên', width: 20, kind: 'text' as const },
      { header: 'Bài làm', width: 40, kind: 'long' as const },
    ]
    expect(rowHeightFor(['An', 'ngắn'], columns)).toBe(20)
    expect(rowHeightFor(['An', 'x'.repeat(5000)], columns)).toBe(71)
    expect(rowHeightFor(['An', 'dòng 1\ndòng 2\ndòng 3'], columns)).toBe(45)
  })
})
