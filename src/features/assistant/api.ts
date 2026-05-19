import { apiClient } from '@/lib/axios'
import type { AssistantBookingDraft, AssistantChatMessage, AssistantChatResponse } from './types'

export async function postAssistantChat(payload: {
  message: string
  history?: AssistantChatMessage[]
  bookingDraft?: AssistantBookingDraft | null
}): Promise<AssistantChatResponse> {
  const { data } = await apiClient.post<AssistantChatResponse>('/assistant/chat', payload)
  return data
}
