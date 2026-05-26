import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TableCell,
  TableRow,
  Table,
  WidthType,
  ShadingType,
  convertInchesToTwip,
} from 'docx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '3B5BDB', space: 4 },
    },
    run: { color: '1E3A8A', bold: true },
  })
}

function guidance(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        italics: true,
        color: '6B7280',
        size: 20,
      }),
    ],
    spacing: { before: 0, after: 60 },
  })
}

function answerLines(count = 5): Paragraph[] {
  return Array.from(
    { length: count },
    () =>
      new Paragraph({
        children: [new TextRun({ text: '', size: 22 })],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB', space: 2 },
        },
        spacing: { before: 0, after: 120 },
      })
  )
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { before: 0, after: 80 } })
}

function headerTable(year: number, month: number): Table {
  const cell = (label: string, value: string) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: label + ': ', bold: true, size: 20, color: '374151' }),
            new TextRun({ text: value, size: 20, color: '374151' }),
          ],
        }),
      ],
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('Họ và tên', '___________________________________'),
          cell('Kỳ báo cáo', `Tháng ${month}/${year}`),
        ],
      }),
      new TableRow({
        children: [
          cell('Phòng/Nhóm', '___________________________________'),
          cell('Ngày nộp', '_____ / _____ / ' + year),
        ],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 0, right: 0 },
  })
}

// ─── Section definitions ──────────────────────────────────────────────────────

type SectionDef = {
  number: string
  title: string
  guidanceLines: string[]
  answerLineCount: number
}

const SECTIONS: SectionDef[] = [
  {
    number: '1',
    title: 'Công việc đã làm',
    guidanceLines: [
      'Liệt kê các công việc cụ thể đã thực hiện trong tháng.',
      'Ví dụ: họp nhóm, xử lý hồ sơ, triển khai dự án A...',
    ],
    answerLineCount: 6,
  },
  {
    number: '2',
    title: 'Kết quả đầu ra',
    guidanceLines: [
      'Mô tả kết quả cụ thể đạt được (sản phẩm, số liệu, deliverables).',
      'Ví dụ: hoàn thành 3/4 hạng mục, đạt 120% doanh số...',
    ],
    answerLineCount: 5,
  },
  {
    number: '3',
    title: 'KPI',
    guidanceLines: [
      'Tổng hợp kết quả KPI so với chỉ tiêu đặt ra trong tháng.',
      'Liệt kê từng chỉ số: Chỉ tiêu — Thực tế — % đạt.',
    ],
    answerLineCount: 6,
  },
  {
    number: '4',
    title: 'OKR',
    guidanceLines: [
      'Mô tả tiến độ các Objectives & Key Results.',
      'Ghi rõ từng KR: tiến độ đạt được, điểm số (0–1.0).',
    ],
    answerLineCount: 5,
  },
  {
    number: '5',
    title: 'Nguyên nhân',
    guidanceLines: [
      'Phân tích nguyên nhân chủ quan và khách quan khi chưa đạt mục tiêu.',
      'Nếu đạt 100% mục tiêu, ghi "Hoàn thành đúng kế hoạch".',
    ],
    answerLineCount: 5,
  },
  {
    number: '6',
    title: 'Vấn đề',
    guidanceLines: [
      'Nêu các vướng mắc, khó khăn gặp phải trong tháng và mức độ ảnh hưởng.',
      'Ví dụ: thiếu tài nguyên, phụ thuộc bên ngoài, quy trình chưa rõ...',
    ],
    answerLineCount: 5,
  },
  {
    number: '7',
    title: 'Minh chứng',
    guidanceLines: [
      'Ghi các link tài liệu, số liệu, ảnh chụp màn hình minh chứng cho kết quả.',
      'Có thể đính kèm file ảnh riêng khi nộp bản cứng hoặc ghi link Google Drive.',
    ],
    answerLineCount: 5,
  },
  {
    number: '8',
    title: 'Đề xuất',
    guidanceLines: [
      'Đề xuất các biện pháp cải thiện, giải pháp tháo gỡ vướng mắc, hoặc ý kiến với cấp trên.',
    ],
    answerLineCount: 5,
  },
  {
    number: '9',
    title: 'Kế hoạch tháng sau',
    guidanceLines: [
      'Liệt kê mục tiêu và kế hoạch hành động cho tháng tiếp theo.',
      'Bao gồm: công việc dự kiến, chỉ tiêu mong đạt, OKR tiếp theo.',
    ],
    answerLineCount: 6,
  },
]

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateWorkReportTemplate(year: number, month: number): Promise<void> {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `BÁO CÁO TỔNG KẾT CÔNG VIỆC THÁNG ${month}/${year}`,
        bold: true,
        size: 32,
        color: '1E3A8A',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
  })

  const subtitle = new Paragraph({
    children: [
      new TextRun({
        text: `Theo dõi tiến độ KPI/OKR cá nhân — hạn nộp 10/${nextMonth}/${nextYear}`,
        italics: true,
        size: 20,
        color: '6B7280',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 240 },
  })

  const requiredNote = new Paragraph({
    children: [
      new TextRun({
        text: '★ Tất cả 9 mục dưới đây là BẮT BUỘC. Vui lòng điền đầy đủ trước khi nộp.',
        bold: true,
        size: 20,
        color: 'DC2626',
      }),
    ],
    spacing: { before: 0, after: 240 },
    shading: { type: ShadingType.SOLID, color: 'FEF2F2' },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: 'DC2626', space: 8 },
    },
  })

  const sectionChildren: Paragraph[] = []

  for (const sec of SECTIONS) {
    sectionChildren.push(
      heading(`Mục ${sec.number} — ${sec.title}`),
      ...sec.guidanceLines.map(guidance),
      spacer(),
      ...answerLines(sec.answerLineCount)
    )
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          titleParagraph,
          subtitle,
          headerTable(year, month),
          spacer(),
          requiredNote,
          spacer(),
          ...sectionChildren,
        ],
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 26,
            bold: true,
            color: '1E3A8A',
          },
          paragraph: {
            spacing: { before: 320, after: 80 },
          },
        },
      ],
    },
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mau-bao-cao-T${month}-${year}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
