import { createFileRoute } from '@tanstack/react-router'
import { ManagerGradingScreen } from '@/features/manager/components/ManagerHub/ManagerGradingScreen'

export const Route = createFileRoute('/_protected/manager/grading')({
  component: ManagerGradingScreen,
})
