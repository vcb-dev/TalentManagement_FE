import { useCallback, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, Info } from 'lucide-react'
import {
  PAGE_HEADER_DESCRIPTION,
  PAGE_HEADER_GRADIENT,
  PAGE_HEADER_SURFACE,
  PAGE_HEADER_TITLE,
} from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { authApi } from '@/features/auth/api'
import { ManagerScreenLayout } from '@/features/manager/components/ManagerHub/ManagerScreenLayout'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeeEntity } from '@/features/hr-admin/api'
import { permissionApi } from '@/features/permissions/permissionApi'
import type { ScopeKey } from '@/features/permissions/branches'
import { applyMandatoryViewRules } from '@/features/permissions/effectivePermissions'
import {
  ROLE_TEMPLATES,
  getTemplateById,
  getTemplateByLinkedRole,
} from '@/features/permissions/roleTemplates'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/auth'
import { PermissionTree } from './PermissionTree'

/** Phân quyền toàn hệ thống — không tách chi nhánh. */
const SCOPE: ScopeKey = 'global'

function templateIdsForRole(role: Role): string[] {
  const t = getTemplateByLinkedRole(role)
  return t ? [t.id] : []
}

function unionFromTemplates(templateIds: string[]): Set<string> {
  const s = new Set<string>()
  for (const tid of templateIds) {
    const t = getTemplateById(tid)
    if (t) for (const id of t.permissionIds) s.add(id)
  }
  return s
}

export interface EmployeePermissionsScreenProps {
  employee: EmployeeEntity
}

export function EmployeePermissionsScreen({ employee }: EmployeePermissionsScreenProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()

  const templateForm = useForm<{ roleTemplateIds: string[] }>({
    defaultValues: { roleTemplateIds: templateIdsForRole(employee.role) },
  })
  const roleTemplateIds = useWatch({ control: templateForm.control, name: 'roleTemplateIds' }) ?? []
  const [selected, setSelected] = useState<Set<string>>(() =>
    applyMandatoryViewRules(unionFromTemplates(templateIdsForRole(employee.role)))
  )
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadFromServer = useCallback(async () => {
    setLoading(true)
    try {
      const rec = await permissionApi.getAssignment(employee.id, SCOPE)
      if (rec) {
        templateForm.setValue('roleTemplateIds', rec.roleTemplateIds)
        setSelected(applyMandatoryViewRules(new Set(rec.grantedPermissionIds)))
      } else {
        const tpl = templateIdsForRole(employee.role)
        templateForm.setValue('roleTemplateIds', tpl)
        setSelected(applyMandatoryViewRules(unionFromTemplates(tpl)))
      }
      setDirty(false)
    } catch (e) {
      toast.error(getApiErrorMessage(e) || 'Không tải được phân quyền')
    } finally {
      setLoading(false)
    }
  }, [employee.id, employee.role, templateForm])

  useEffect(() => {
    void loadFromServer()
  }, [loadFromServer])

  const onToggleTemplate = (tplId: string, checked: boolean) => {
    const tpl = getTemplateById(tplId)
    if (!tpl) return
    const currentList = templateForm.getValues('roleTemplateIds') ?? []
    const nextList = checked
      ? [...new Set([...currentList, tplId])]
      : currentList.filter((x) => x !== tplId)
    templateForm.setValue('roleTemplateIds', nextList)
    setSelected((old) => {
      const n = new Set(old)
      if (checked) {
        for (const id of tpl.permissionIds) n.add(id)
      } else {
        const otherUnion = unionFromTemplates(nextList.filter((x) => x !== tplId))
        for (const pid of tpl.permissionIds) {
          if (!otherUnion.has(pid)) n.delete(pid)
        }
      }
      return applyMandatoryViewRules(n)
    })
    setDirty(true)
  }

  const onSave = async () => {
    const dataScopeFlags: Record<string, boolean> = {}
    for (const id of selected) {
      if (id.startsWith('data.')) dataScopeFlags[id] = true
    }
    setSaving(true)
    try {
      await permissionApi.saveAssignment({
        userId: employee.id,
        scopeKey: SCOPE,
        roleTemplateIds,
        grantedPermissionIds: [...selected],
        dataScopeFlags,
      })
      toast.success('Đã lưu phân quyền')
      setDirty(false)
      if (employee.id === currentUserId) {
        const me = await authApi.me()
        useAuthStore.getState().setSession(me.user, me.accessToken ?? null)
      }
      void navigate({ to: '/permissions' })
    } catch (e) {
      toast.error(getApiErrorMessage(e) || 'Không lưu được')
    } finally {
      setSaving(false)
    }
  }

  const onCancel = () => {
    void loadFromServer()
  }

  return (
    <ManagerScreenLayout hideHubNav hideToolbar>
      <div className="mb-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className={cn('min-w-0 flex-1', PAGE_HEADER_SURFACE)}>
            <Link
              to="/permissions"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Danh sách nhân viên
            </Link>
            <h1 className={PAGE_HEADER_TITLE}>
              <span className={PAGE_HEADER_GRADIENT}>Phân quyền cho {employee.name}</span>
            </h1>
            <p className={PAGE_HEADER_DESCRIPTION}>{employee.email}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pb-1">
            {dirty ? (
              <Badge
                variant="outline"
                className="border-amber-500/35 bg-amber-500/10 font-medium text-amber-900"
              >
                Chỉnh sửa chưa được lưu
              </Badge>
            ) : (
              <Badge variant="muted" className="font-medium">
                Đã đồng bộ
              </Badge>
            )}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/permissions">Đóng</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={loading || !dirty}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void onSave()}
              disabled={loading || !dirty}
              loading={saving}
            >
              Lưu
            </Button>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.07] via-primary/[0.04] to-primary/[0.06] px-4 py-3.5 shadow-[var(--shadow-card)]">
          <Info className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Quyền áp dụng cho toàn hệ thống. Chọn một hoặc nhiều vai trò mẫu (theo role VCB HRM),
            sau đó chọn từng màn hình ở phần quyền chi tiết (mỗi màn = bật hết thao tác trên màn
            đó).
          </p>
        </div>

        <section
          className={cn(
            'overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-sm md:p-6',
            CARD_ENTRANCE_HOVER
          )}
        >
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
            Vai trò mẫu
          </h2>
          <div className="flex flex-wrap gap-2">
            {ROLE_TEMPLATES.map((t) => {
              const active = roleTemplateIds.includes(t.id)
              return (
                <label
                  key={t.id}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm transition-[border-color,background-color,box-shadow]',
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground ring-1 ring-primary/15'
                      : 'border-border bg-muted/30 text-foreground hover:border-primary/25 hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={active}
                    onCheckedChange={(v) => onToggleTemplate(t.id, v === true)}
                  />
                  {t.name}
                </label>
              )
            })}
          </div>
        </section>

        <section
          className={cn(
            'overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-sm md:p-6',
            CARD_ENTRANCE_HOVER
          )}
        >
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
            Quyền chi tiết
          </h2>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : (
            <PermissionTree
              selected={selected}
              onChange={(next) => {
                setSelected(next)
                setDirty(true)
              }}
            />
          )}
        </section>
      </div>
    </ManagerScreenLayout>
  )
}
