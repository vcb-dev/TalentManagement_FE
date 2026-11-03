import { useState, type ReactNode } from 'react'
import type { ChecklistAnswers, ChecklistQuestion } from '../types'
import { ChecklistFormHeader, ChecklistFormItems } from './ChecklistForm'

/**
 * Form như người điền sẽ thấy — bấm chọn thử được nhưng không lưu.
 * Dùng cho nút "Xem trước" khi soạn, "Xem form" ở danh sách mẫu và hồ sơ nhân sự.
 */
export function ChecklistPreview({
  title,
  description,
  questions,
  meta = 'Xem trước — câu trả lời ở đây không được lưu.',
}: {
  title: string
  description: string | null
  questions: ChecklistQuestion[]
  meta?: ReactNode
}) {
  const [answers, setAnswers] = useState<ChecklistAnswers>({})
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <ChecklistFormHeader
        title={title}
        description={description}
        meta={meta}
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
