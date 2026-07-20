import { useEffect, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useEmployeeLoginCredential,
  useUpsertEmployeeLoginCredential,
} from '@/features/hr-admin/loginCredentialHooks'
import { useAnyActionPending } from '@/features/hr-admin/hooks'

interface EmployeeLoginCredentialCardProps {
  employeeId: string
  canEdit: boolean
}

export function EmployeeLoginCredentialCard({
  employeeId,
  canEdit,
}: EmployeeLoginCredentialCardProps) {
  const { data, isLoading } = useEmployeeLoginCredential(employeeId, canEdit)
  const upsert = useUpsertEmployeeLoginCredential(employeeId)
  const anyActionPending = useAnyActionPending()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (data?.username) setUsername(data.username)
  }, [data?.username])

  if (!canEdit) return null

  const hasCredential = Boolean(data?.username)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const u = username.trim()
    if (!u || password.length < 8) return
    upsert.mutate({ username: u, password }, { onSuccess: () => setPassword('') })
  }

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Tài khoản đăng nhập</h2>
          <p className="text-xs text-muted-foreground">
            HR/Manager đặt username và mật khẩu — nhân viên đăng nhập thay cho Google.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </div>
      ) : (
        <form className="max-w-md space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Mật khẩu</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={anyActionPending || !username.trim() || password.length < 8}
          >
            {upsert.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasCredential ? (
              'Cập nhật'
            ) : (
              'Tạo tài khoản'
            )}
          </Button>
        </form>
      )}
    </section>
  )
}
