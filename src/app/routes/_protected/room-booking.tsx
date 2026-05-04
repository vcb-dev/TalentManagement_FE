import { createFileRoute } from '@tanstack/react-router'
import RoomBookingPage from '@/features/room-booking/RoomBookingPage'

export const Route = createFileRoute('/_protected/room-booking')({
  component: RoomBookingPage,
})
