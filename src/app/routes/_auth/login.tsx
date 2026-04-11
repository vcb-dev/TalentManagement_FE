import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Award, Eye, EyeOff, KeyRound, Lock, Mail, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { authApi } from '@/features/auth/api'
import { loginRequestSchema } from '@/features/auth/schemas'
import { useLogin } from '@/features/auth/hooks'
import { defaultEntryPathFromSession } from '@/lib/routeGuards'
import { MOCK_ACCOUNT_LIST, MOCK_PASSWORD } from '@/features/auth/mock/mockAccounts'
import { ensureSessionFromCookie } from '@/features/auth/sessionBootstrap'
import { isMockApiEnabled } from '@/lib/mockEnv'
import { ROLE_LABEL_VI } from '@/lib/roleLabels'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  oauth: z.enum(['success', 'error']).optional(),
  /** BE redirect kèm lý do (OAuth / JWT / cookie). */
  msg: z.string().optional(),
})

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (raw) => loginSearchSchema.parse(raw),
  beforeLoad: async ({ search }) => {
    if (search.oauth === 'success' || search.oauth === 'error') return
    await ensureSessionFromCookie()
    const { accessToken, user } = useAuthStore.getState()
    if (user || accessToken) {
      const target = defaultEntryPathFromSession(user ?? undefined)
      if (target === '/hr-admin') throw redirect({ to: '/hr-admin', search: { page: 1 } })
      throw redirect({ to: target })
    }
  },
  component: LoginPage,
})

type LoginForm = z.infer<typeof loginRequestSchema>

/** Tránh open redirect; chỉ cho path nội bộ (pathname bắt đầu bằng `/`, không phải `//...`). */
function isSafeInternalRedirect(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const search = Route.useSearch()
  const setSession = useAuthStore((s) => s.setSession)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })
  const mockApi = isMockApiEnabled()
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const googleOAuthHref = apiBase ? `${apiBase.replace(/\/$/, '')}/auth/google` : ''
  const useRealGoogleOAuth = !mockApi && Boolean(googleOAuthHref)

  const appName = import.meta.env.VITE_APP_NAME ?? 'VCB HRM'

  const onAuthSuccess = useCallback(() => {
    if (search.redirect && isSafeInternalRedirect(search.redirect)) {
      void navigate({ href: search.redirect })
      return
    }
    const u = useAuthStore.getState().user
    const target = defaultEntryPathFromSession(u ?? undefined)
    if (target === '/hr-admin') void navigate({ to: '/hr-admin', search: { page: 1 } })
    else void navigate({ to: target })
  }, [navigate, search.redirect])

  useEffect(() => {
    if (search.oauth === 'error') {
      const detail = search.msg?.trim()
      toast.error(
        detail
          ? `Đăng nhập thất bại: ${detail}`
          : 'Đăng nhập Google thất bại hoặc email chưa có trong hệ thống.'
      )
      void navigate({ to: '/login', search: { redirect: search.redirect }, replace: true })
      return
    }
    if (search.oauth !== 'success') return
    void (async () => {
      try {
        const d = await authApi.me()
        setSession(d.user, d.accessToken ?? null)
        onAuthSuccess()
      } catch (err) {
        toast.error(
          'Không lấy được phiên đăng nhập. Kiểm tra cookie tm_session, VITE_API_URL và cấu hình OAuth.'
        )
        console.warn('[login oauth=success] GET /auth/me failed', err)
        void navigate({ to: '/login', search: { redirect: search.redirect }, replace: true })
      }
    })()
  }, [search.oauth, search.msg, search.redirect, navigate, setSession, onAuthSuccess])

  return (
    <div className="login-page-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-sm leading-relaxed text-gray-900">
      <div className="relative z-0 flex w-full max-w-[420px] flex-col items-stretch">
        <div
          className={cn(
            'rounded-[12px] bg-white p-10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
            'border border-black/[0.04]'
          )}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
              <Award className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="text-[26px] font-bold leading-tight tracking-tight text-gray-900">
              {appName}
            </div>
            <div className="mt-1.5 text-[13px] font-normal text-gray-600">
              Quản trị Hiệu suất Ưu tú
            </div>
          </div>

          {useRealGoogleOAuth ? (
            <div className="mb-2 flex flex-col items-stretch gap-3">
              <a
                href={googleOAuthHref}
                className={cn(
                  'group relative flex h-[52px] w-full items-center justify-center gap-3 overflow-hidden rounded-xl',
                  'border-2 border-gray-200/90 bg-white px-4 text-[15px] font-semibold tracking-tight text-gray-800',
                  'shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all duration-200',
                  'hover:-translate-y-0.5 hover:border-[#4285F4]/45 hover:shadow-[0_10px_28px_-6px_rgba(66,133,244,0.45)]',
                  'active:translate-y-0 active:shadow-[0_4px_14px_rgba(0,0,0,0.1)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50 focus-visible:ring-offset-2'
                )}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-hidden
                >
                  <span className="absolute -left-1/4 top-0 h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent blur-sm" />
                </span>
                <svg
                  className="relative z-[1] h-[22px] w-[22px] shrink-0 transition-transform duration-200 group-hover:scale-110"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="relative z-[1]">Đăng nhập với Google</span>
              </a>
            </div>
          ) : !mockApi && !googleOAuthHref ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              Cấu hình <code className="font-mono text-[11px]">VITE_API_URL</code> trỏ tới BE và
              trên BE bật <code className="font-mono text-[11px]">GOOGLE_CLIENT_ID</code>,{' '}
              <code className="font-mono text-[11px]">GOOGLE_CLIENT_SECRET</code>,{' '}
              <code className="font-mono text-[11px]">FRONTEND_URL</code>. Hoặc bật{' '}
              <code className="font-mono text-[11px]">VITE_USE_MOCK_API</code> để demo.
            </p>
          ) : null}

          {mockApi ? (
            <form
              className="space-y-0"
              onSubmit={form.handleSubmit((v) =>
                login.mutate(v, {
                  onSuccess: onAuthSuccess,
                })
              )}
            >
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold tracking-wide text-gray-500"
                >
                  ĐỊA CHỈ EMAIL
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@vcb.com.vn"
                    className={cn(
                      'h-12 w-full rounded-lg border border-[#e0e0e0] bg-white py-3 pl-11 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 placeholder:text-[13px]',
                      'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
                      form.formState.errors.email && 'border-red-400'
                    )}
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="mb-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="password"
                    className="text-[11px] font-semibold tracking-wide text-gray-500"
                  >
                    MẬT KHẨU
                  </label>
                  <a
                    href="#"
                    className="text-xs font-medium text-primary hover:opacity-90"
                    onClick={(e) => e.preventDefault()}
                  >
                    Chính sách bảo mật
                  </a>
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      'h-12 w-full rounded-lg border border-[#e0e0e0] bg-white py-3 pl-11 pr-11 text-sm text-gray-900 outline-none placeholder:text-gray-400',
                      'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
                      form.formState.errors.password && 'border-red-400'
                    )}
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={login.isPending}
                className="mt-5 h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-[0.96] disabled:pointer-events-none disabled:opacity-50"
              >
                {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </form>
          ) : null}

          {mockApi ? (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                Tài khoản demo (mock)
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Mật khẩu chung:{' '}
                <code className="rounded-md bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] text-primary ring-1 ring-primary/15">
                  {MOCK_PASSWORD}
                </code>
                . Chọn một dòng để điền email và mật khẩu.
              </p>
              <ul
                className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-0.5 [-webkit-overflow-scrolling:touch]"
                aria-label="Danh sách tài khoản thử"
              >
                {MOCK_ACCOUNT_LIST.map((acc) => (
                  <li key={acc.email}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2.5 text-left text-xs transition-colors',
                        'hover:border-primary/35 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'
                      )}
                      onClick={() => {
                        form.setValue('email', acc.email, { shouldValidate: true })
                        form.setValue('password', MOCK_PASSWORD, { shouldValidate: true })
                      }}
                    >
                      <span className="font-mono text-[11px] font-semibold text-gray-900 sm:text-xs">
                        {acc.email}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-gray-500 sm:text-[11px]">
                        <span className="font-medium text-primary/90">
                          {ROLE_LABEL_VI[acc.role]}
                        </span>
                        {' — '}
                        {acc.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-10 max-w-[min(calc(100vw-2rem),260px)] rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:bottom-6 sm:right-6 sm:px-4 sm:py-3"
        style={{ borderRadius: 12 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[9px] font-semibold tracking-wide text-gray-500">
              THÀNH TÍCH GẦN ĐÂY
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900">
              Top 5 Cụm Hiệu suất
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
