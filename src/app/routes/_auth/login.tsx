import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { loginRequestSchema } from '@/features/auth/schemas'
import { MOCK_ACCOUNT_LIST, MOCK_PASSWORD } from '@/features/auth/mock/mockAccounts'
import { useLogin } from '@/features/auth/hooks'
import { defaultPathForRole } from '@/lib/routeGuards'
import { isMockApiEnabled } from '@/lib/mockEnv'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (raw) => loginSearchSchema.parse(raw),
  beforeLoad: () => {
    const { accessToken, user } = useAuthStore.getState()
    if (accessToken) {
      const target = defaultPathForRole(user?.role)
      if (user?.role === 'HR_ADMIN') throw redirect({ to: '/hr-admin', search: { page: 1 } })
      throw redirect({ to: target })
    }
  },
  component: LoginPage,
})

type LoginForm = z.infer<typeof loginRequestSchema>

const ROLE_ROWS: {
  initials: string
  avatar: string
  title: string
  desc: string
}[] = [
  {
    initials: 'HR',
    avatar: 'bg-primary/10 text-primary',
    title: 'HR',
    desc: 'CRUD nhân sự toàn công ty, xem thi & lộ trình nhân viên',
  },
  {
    initials: 'NV',
    avatar: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    title: 'Nhân viên',
    desc: 'Dashboard cá nhân, lộ trình checklist, kết quả thi, hồ sơ',
  },
  {
    initials: 'GV',
    avatar: 'bg-primary/10 text-primary',
    title: 'Người chấm thi',
    desc: 'Do Manager chỉ định tạm theo kỳ — lớp, chấm bài, phân loại kết quả',
  },
  {
    initials: 'QL',
    avatar: 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
    title: 'Quản lý',
    desc: 'Team, chia lớp, lịch thi, duyệt bài & thăng cấp, CRUD bài tập',
  },
  {
    initials: 'BD',
    avatar: 'bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
    title: 'BOD',
    desc: 'Tổng quan nhân sự, xếp hạng tập sự, so sánh team',
  },
]

/** Tránh open redirect; chỉ cho path nội bộ (pathname bắt đầu bằng `/`, không phải `//...`). */
function isSafeInternalRedirect(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

const inputClass =
  'w-full rounded-lg border border-border bg-card px-3 py-[9px] text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const search = Route.useSearch()
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  const appName = import.meta.env.VITE_APP_NAME ?? 'VCB HRM'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-canvas p-4 text-sm leading-relaxed text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)_/_0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
        aria-hidden
      />
      <div
        className={cn(
          'relative w-full max-w-[380px] rounded-2xl border border-border/80 bg-card/95 p-10 shadow-[var(--shadow-card)] backdrop-blur-sm',
          CARD_ENTRANCE_HOVER
        )}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-accent text-[22px] font-bold text-button-foreground shadow-md ring-2 ring-primary/20">
            V
          </div>
          <div className="text-[26px] font-extrabold tracking-tight text-primary">{appName}</div>
          <div className="mt-1.5 text-sm text-muted-foreground">
            Học tập & phát triển nội bộ
          </div>
        </div>

        <form
          className="space-y-0"
          onSubmit={form.handleSubmit((v) =>
            login.mutate(v, {
              onSuccess: () => {
                if (search.redirect && isSafeInternalRedirect(search.redirect)) {
                  // Không dùng window.location: reload sẽ xóa Zustand → mất token → bị guard đẩy lại /login
                  void navigate({ href: search.redirect })
                  return
                }
                const role = useAuthStore.getState().user?.role
                if (role === 'HR_ADMIN') void navigate({ to: '/hr-admin', search: { page: 1 } })
                else void navigate({ to: defaultPathForRole(role) })
              },
            })
          )}
        >
          <div className="mb-2 flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
              Email công ty
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="ten@vcb.com"
              className={cn(inputClass, form.formState.errors.email && 'border-red-400')}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="mb-2 flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={cn(inputClass, form.formState.errors.password && 'border-red-400')}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-1 w-full rounded-lg border border-button bg-button px-3.5 py-2 text-xs font-medium text-button-foreground transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="my-2.5 h-px bg-border" />

        <div className="flex flex-col gap-1.5">
          {ROLE_ROWS.map((row) => (
            <div
              key={row.initials}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2 py-1.5 text-xs transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-sm"
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  row.avatar
                )}
              >
                {row.initials}
              </div>
              <div>
                <div className="font-semibold text-foreground">{row.title}</div>
                <div className="text-xs text-muted-foreground">{row.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Role được xác định tự động từ hệ thống
        </p>

        {isMockApiEnabled() ? (
          <div className="mt-4 max-h-[220px] overflow-y-auto rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-left text-xs leading-snug text-muted-foreground">
            <p className="mb-2 font-semibold text-primary">Dữ liệu giả (VITE_USE_MOCK_API)</p>
            <p className="mb-2">
              Mật khẩu chung: <span className="font-mono font-semibold text-foreground">{MOCK_PASSWORD}</span>
            </p>
            <ul className="space-y-1.5">
              {MOCK_ACCOUNT_LIST.map((a) => (
                <li key={a.email}>
                  <span className="font-mono text-xs text-primary">{a.email}</span>
                  <span className="text-muted-foreground"> — {a.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
