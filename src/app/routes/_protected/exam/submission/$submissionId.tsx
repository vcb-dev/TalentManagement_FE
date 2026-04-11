import { createFileRoute } from '@tanstack/react-router'
import { MemberSubmissionResultScreen } from '@/features/exam/components/MemberSubmissionResultScreen'

export const Route = createFileRoute('/_protected/exam/submission/$submissionId')({
  component: MemberSubmissionRoute,
})

function MemberSubmissionRoute() {
  const { submissionId } = Route.useParams()
  return <MemberSubmissionResultScreen submissionId={submissionId} />
}
