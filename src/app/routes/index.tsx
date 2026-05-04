import { createFileRoute } from '@tanstack/react-router'
import { AboutUsPage } from '@/features/landing/AboutUsPage'
import { ensureSessionFromCookie } from '@/features/auth/sessionBootstrap'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Vẫn bootstrap session để header nhận biết trạng thái đăng nhập
    // và hiển thị CTA phù hợp, nhưng KHÔNG redirect — trang home luôn là điểm đến đầu tiên.
    await ensureSessionFromCookie()
  },
  component: AboutUsPage,
})
