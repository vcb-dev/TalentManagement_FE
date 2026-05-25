import { apiClient } from '@/lib/axios'
import type {
  AssistantBookingDraft,
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantStructuredReport,
} from './types'

export async function postAssistantChat(payload: {
  message: string
  history?: AssistantChatMessage[]
  bookingDraft?: AssistantBookingDraft | null
  pageContext?: {
    path?: string
    teamId?: string
    year?: number
    month?: number
  }
}): Promise<AssistantChatResponse> {
  const { data } = await apiClient.post<AssistantChatResponse>('/assistant/chat', {
    ...payload,
    history: payload.history?.map((m) => ({ role: m.role, content: m.content })),
  })
  return data
}

export async function downloadAssistantReportDocx(
  structuredReport: AssistantStructuredReport
): Promise<Blob> {
  const { data } = await apiClient.post<Blob>(
    '/assistant/reports/docx',
    { structuredReport },
    { responseType: 'blob' }
  )
  return data
}
