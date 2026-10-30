import {
  checklistQuestionNumbers,
  formatChecklistAnswer,
  gridAnswerLines,
} from '../checklistAnswers'
import type { ChecklistAnswers, ChecklistQuestion } from '../types'

/** Câu trả lời chỉ đọc — dùng cho admin và cho bản đã điền của mẫu ngừng áp dụng. */
export function ChecklistAnswersView({
  questions,
  answers,
}: {
  questions: ChecklistQuestion[]
  answers: ChecklistAnswers
}) {
  const numbers = checklistQuestionNumbers(questions)
  return (
    <div className="space-y-3">
      {questions.map((q) => {
        if (q.type === 'SECTION') {
          return (
            <h3 key={q.id} className="pt-2 text-sm font-bold uppercase tracking-wide text-button">
              {q.title}
            </h3>
          )
        }
        const grid = q.type === 'GRID' ? gridAnswerLines(q, answers[q.id]) : null
        const text = grid ? '' : formatChecklistAnswer(q, answers[q.id])
        return (
          <div key={q.id} className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              <span className="mr-1 text-muted-foreground">{numbers.get(q.id)}.</span>
              {q.title}
              {q.required ? <span className="ml-1 text-danger">*</span> : null}
            </p>
            {grid && grid.length > 0 ? (
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
                {grid.map((l) => (
                  <div key={l.row} className="contents">
                    <dt className="text-muted-foreground">{l.row}</dt>
                    <dd className="text-foreground/90">{l.value}</dd>
                  </div>
                ))}
              </dl>
            ) : text ? (
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{text}</p>
            ) : (
              <p className="mt-1 text-sm italic text-muted-foreground">Chưa trả lời</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
