import { apiClient } from '@/lib/axios'
import { uploadFileToBE } from '@/lib/fileUploadUtils'

export interface MeetingBooking {
  id: string
  userId: string
  userName: string
  team: string
  room: string
  reason: string
  date: string
  timeFrom: string
  timeTo: string
  note?: string
  status: 'pending' | 'approved' | 'rejected'
  isEmergency: boolean
  isOverridden: boolean
  createdAt: string
  updatedAt: string
  timeStatus?: 'upcoming' | 'ongoing' | 'done'
  minutesFileUrl?: string | null
  minutesFileName?: string | null
  minutesUploadedAt?: string | null
  user?: { email: string; fullNameLegal: string }
}

export interface BookedSlot {
  id: string
  timeFrom: string
  timeTo: string
  status: string
  userName: string
  reason: string
}

export interface AvailabilityResponse {
  room: string
  date: string
  bookedSlots: BookedSlot[]
}

export interface CreateBookingPayload {
  room: string
  reason: string
  date: string
  timeFrom: string
  timeTo: string
  note?: string
  isEmergency?: boolean
}

export async function getBookings(): Promise<MeetingBooking[]> {
  const { data } = await apiClient.get<MeetingBooking[]>('/room-booking')
  return data
}

export async function getMyBookings(): Promise<MeetingBooking[]> {
  const { data } = await apiClient.get<MeetingBooking[]>('/room-booking/my')
  return data
}

export async function getAvailability(room: string, date: string): Promise<AvailabilityResponse> {
  const { data } = await apiClient.get<AvailabilityResponse>('/room-booking/availability', {
    params: { room, date },
  })
  return data
}

export async function createBooking(payload: CreateBookingPayload): Promise<MeetingBooking> {
  const { data } = await apiClient.post<MeetingBooking>('/room-booking', payload)
  return data
}

export async function approveBooking(id: string): Promise<MeetingBooking> {
  const { data } = await apiClient.patch<MeetingBooking>(`/room-booking/${id}/approve`)
  return data
}

export async function rejectBooking(id: string, reason: string): Promise<MeetingBooking> {
  const { data } = await apiClient.patch<MeetingBooking>(`/room-booking/${id}/reject`, { reason })
  return data
}

export async function deleteBooking(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/room-booking/${id}`)
  return data
}

export async function updateBooking(
  id: string,
  payload: Partial<CreateBookingPayload>
): Promise<MeetingBooking> {
  const { data } = await apiClient.patch<MeetingBooking>(`/room-booking/${id}`, payload)
  return data
}
export async function finishBooking(id: string): Promise<MeetingBooking> {
  const { data } = await apiClient.patch<MeetingBooking>(`/room-booking/${id}/finish`)
  return data
}

export async function uploadMeetingMinutes(id: string, file: File): Promise<MeetingBooking> {
  return uploadFileToBE<MeetingBooking>(`/room-booking/${id}/minutes`, file)
}
