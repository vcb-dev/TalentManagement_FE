import { useState, type ReactNode } from 'react'
import type { ChecklistAnswers, ChecklistQuestion, ChecklistSubjectInfo } from '../types'
import { ChecklistFormHeader, ChecklistFormItems } from './ChecklistForm'
import { ChecklistSubjectInfoGrid } from './ChecklistSubjectInfo'

/**
 * Form như người điền sẽ thấy — bấm chọn thử được nhưng không lưu.
 * Dùng cho nút "Xem trước" khi soạn, "Xem form" ở danh sách mẫu và hồ sơ nhân sự.
 * `subjectInfo`: thông tin của một nhân sự cụ thể; bỏ trống = khối thông tin dạng mẫu.
 */
export function ChecklistPreview({
  title,
  description,
  questions,
  meta = 'Xem trước — câu trả lời ở đây không được lưu.',
  subjectInfo = null,
}: {
  title: string
  description: string | null
  questions: ChecklistQuestion[]
  meta?: ReactNode
  subjectInfo?: ChecklistSubjectInfo | null
}) {
  const [answers, setAnswers] = useState<ChecklistAnswers>({})
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <ChecklistFormHeader
        title={title}
        description={description}
        meta={meta}
        subject={<ChecklistSubjectInfoGrid info={subjectInfo} />}
        showRequiredNote={questions.some((q) => q.required)}
      />
      <ChecklistFormItems
        questions={questions}
        answers={answers}
        onChange={(id, v) =>
          setAnswers((prev) => {
            const next = { ...prev }
            if (v === undefined) delete next[id]
            else next[id] = v
            return next
          })
        }
      />
    </div>
  )
}
