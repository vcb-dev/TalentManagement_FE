import { createFileRoute } from '@tanstack/react-router'
import RoomBookingPage from '@/features/room-booking/RoomBookingPage'

import { z } from 'zod'

const roomBookingSearchSchema = z.object({
  room: z.string().optional(),
  /** `history` = lịch sử đặt phòng của tôi; giá trị khác (vd. `requests` từ menu duyệt) bỏ qua như trước. */
  tab: z.enum(['history']).optional().catch(undefined),
})

export const Route = createFileRoute('/_protected/room-booking')({
  validateSearch: (search) => roomBookingSearchSchema.parse(search),
  component: RoomBookingPage,
})
