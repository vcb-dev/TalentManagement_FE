import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatChecklistTime, personName } from '../checklistAnswers'
import type { ChecklistPerson, ChecklistQuestion, ChecklistResponse } from '../types'
import { ChecklistAnswersView } from './ChecklistAnswersView'

export type ChecklistResponseDialogTarget = {
  title: string
  questions: ChecklistQuestion[]
  subject: ChecklistPerson
  response: ChecklistResponse
}

/** Admin xem một bản trả lời (chỉ đọc). */
export function ChecklistResponseDialog({
  target,
  onClose,
}: {
  target: ChecklistResponseDialogTarget | null
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle>{target.title}</DialogTitle>
              <DialogDescription>
                Nhân sự:{' '}
                <span className="font-medium text-foreground">{personName(target.subject)}</span>
                {' · '}Người điền:{' '}
                <span className="font-medium text-foreground">
                  {target.response.respondent.id === target.subject.id
                    ? 'Tự điền'
                    : personName(target.response.respondent)}
                </span>
                {' · '}Cập nhật {formatChecklistTime(target.response.updatedAt)}
              </DialogDescription>
            </DialogHeader>
            <ChecklistAnswersView questions={target.questions} answers={target.response.answers} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
