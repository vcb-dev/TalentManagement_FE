export type AssistantChatRole = 'user' | 'assistant'

export type AssistantChatMessage = {
  role: AssistantChatRole
  content: string
}

export type AssistantSource = {
  title: string
  snippet: string
}

export type AssistantBookingDraft = {
  room?: string
  date?: string
  timeFrom?: string
  timeTo?: string
  reason?: string
  note?: string
}

export type AssistantBookingStatus = 'idle' | 'collecting' | 'confirm' | 'done' | 'cancelled'

export type AssistantChatResponse = {
  reply: string
  blocked: boolean
  block_reason?: string | null
  sources: AssistantSource[]
  scope: 'in_scope' | 'off_topic' | 'low_confidence' | string
  bookingDraft?: AssistantBookingDraft | null
  bookingStatus?: AssistantBookingStatus
}
