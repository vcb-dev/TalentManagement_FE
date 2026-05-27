import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Link2, ClipboardCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchCskhPages,
  fetchRunningCskhJob,
  getCskhOAuthStartUrl,
  refreshCskhOAuth,
  setCskhPageEnabled,
  setCskhPagesEnabledBulk,
  type CskhPagesResponse,
} from './api'
import { AuditMessengerView } from './AuditMessengerView'
import { CskhGlassPanel, CskhPageShell, CskhPageAvatar, CskhTabNav } from './cskhUi'

type Tab = 'config' | 'audit'

const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function ConfigTab() {
  const qc = useQueryClient()
  const pagesQueryKey = ['cskh', 'pages'] as const
  const { data, isLoading, refetch } = useQuery({
    queryKey: pagesQueryKey,
    queryFn: fetchCskhPages,
  })

  const [syncingIds, setSyncingIds] = useState<Set<string>>(() => new Set())

  const patchPagesCache = useCallback(
    (updater: (pages: CskhPagesResponse['pages']) => CskhPagesResponse['pages']) => {
      qc.setQueryData<CskhPagesResponse>(pagesQueryKey, (prev) => {
        if (!prev) return prev
        return { ...prev, pages: updater(prev.pages) }
      })
    },
    [qc, pagesQueryKey]
  )

  const refreshMut = useMutation({
    mutationFn: refreshCskhOAuth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cskh'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ pageId, enabled }: { pageId: string; enabled: boolean }) =>
      setCskhPageEnabled(pageId, enabled),
    onMutate: async ({ pageId, enabled }) => {
      setSyncingIds((prev) => new Set(prev).add(pageId))
      await qc.cancelQueries({ queryKey: pagesQueryKey })
      const prev = qc.getQueryData<CskhPagesResponse>(pagesQueryKey)
      patchPagesCache((pages) => pages.map((p) => (p.pageId === pageId ? { ...p, enabled } : p)))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(pagesQueryKey, ctx.prev)
    },
    onSettled: (_data, _err, { pageId }) => {
      setSyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(pageId)
        return next
      })
    },
  })

  const bulkMut = useMutation({
    mutationFn: (enabled: boolean) => setCskhPagesEnabledBulk(enabled),
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: pagesQueryKey })
      const prev = qc.getQueryData<CskhPagesResponse>(pagesQueryKey)
      patchPagesCache((pages) => pages.map((p) => ({ ...p, enabled })))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(pagesQueryKey, ctx.prev)
    },
  })

  const pages = data?.pages ?? []
  const enabledCount = pages.filter((p) => p.enabled).length
  const allEnabled = pages.length > 0 && enabledCount === pages.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-indigo-500" /> Đang tải cấu hình…
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1877F2] via-[#0866FF] to-indigo-700 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Link2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Kết nối Facebook</h3>
                <p className="text-sm text-blue-100">OAuth Meta — token Page bạn quản trị</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={getCskhOAuthStartUrl()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1877F2] shadow-md transition hover:bg-blue-50"
              >
                <Link2 className="h-4 w-4" /> Kết nối Facebook
              </a>
              <button
                type="button"
                disabled={!data?.oauthConnected || refreshMut.isPending}
                onClick={() => refreshMut.mutate()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              >
                {refreshMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Làm mới token
              </button>
            </div>
            {data?.oauthConnected ? (
              <div className="flex items-start gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p>
                    Đã kết nối: <strong>{data.oauthUser}</strong>
                  </p>
                  {data.oauthUpdatedAt && (
                    <p className="mt-0.5 text-xs text-blue-100">
                      Cập nhật {new Date(data.oauthUpdatedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-100">Chưa kết nối — bấm nút trên để bắt đầu.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-6">
          <h3 className="font-bold text-slate-800">Hướng dẫn nhanh</h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                1
              </span>
              Kết nối Facebook và bật Page cần theo dõi
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                2
              </span>
              Tab <strong>Chat</strong> — nhắn tin real-time với khách
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-xs font-bold text-white">
                3
              </span>
              Tab <strong>Audit</strong> — AI chấm điểm &amp; gợi ý trả lời
            </li>
          </ol>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-800">Facebook Pages</h3>
            {pages.length ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {enabledCount} / {pages.length} Page đang bật audit
              </p>
            ) : null}
          </div>
          {pages.length ? (
            <button
              type="button"
              onClick={() => bulkMut.mutate(!allEnabled)}
              className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              {allEnabled ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          ) : null}
        </div>

        {pages.length > 0 && enabledCount > 5 && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Đang bật {enabledCount} Page — audit sẽ chậm. Chỉ bật 1–5 Page CSKH thực sự cần theo
            dõi.
          </div>
        )}

        {!pages.length ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Chưa có Page — kết nối Facebook ở trên.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pages.map((p) => (
              <li
                key={p.pageId}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition-opacity ${
                  syncingIds.has(p.pageId) ? 'opacity-60' : 'opacity-100'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CskhPageAvatar
                    name={p.pageName || p.pageId}
                    pictureUrl={p.pagePictureUrl}
                    pageId={p.pageId}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{p.pageName || p.pageId}</p>
                    <p className="truncate text-xs text-slate-400">ID: {p.pageId}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Checkbox
                    id={`cskh-page-${p.pageId}`}
                    checked={p.enabled}
                    onCheckedChange={(checked) =>
                      toggleMut.mutate({ pageId: p.pageId, enabled: checked === true })
                    }
                  />
                  <label
                    htmlFor={`cskh-page-${p.pageId}`}
                    className="cursor-pointer select-none text-sm font-medium text-slate-700"
                  >
                    Bật audit
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void refetch()}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        Tải lại danh sách
      </button>
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: 'audit', label: 'Audit', icon: ClipboardCheck },
  { id: 'config', label: 'Cấu hình', icon: Link2 },
]

export function CskhQualityPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'config'
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab')
    if (t === 'audit' || t === 'config') return t
    if (p.get('tab') === 'chat') return 'audit'
    if (p.get('fb_connected')) return 'config'
    return 'audit'
  })
  const [auditJobId, setAuditJobId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob('audit')
        if (running?.status === 'running') {
          setAuditJobId(running.id)
          sessionStorage.setItem(AUDIT_JOB_KEY, running.id)
        } else {
          sessionStorage.removeItem(AUDIT_JOB_KEY)
        }
      } catch {
        sessionStorage.removeItem(AUDIT_JOB_KEY)
      }
    })()
    const p = new URLSearchParams(window.location.search)
    if (p.get('fb_connected') || p.get('oauth_error')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('fb_connected')
      url.searchParams.delete('oauth_error')
      if (p.get('tab') === 'monitor') url.searchParams.set('tab', 'audit')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  return (
    <CskhPageShell>
      <CskhTabNav
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={TABS.map(({ id, label, icon: Icon }) => ({
          id,
          label,
          icon: <Icon className="h-4 w-4" />,
          busy: id === 'audit' && !!auditJobId,
        }))}
      />

      <CskhGlassPanel className={tab === 'audit' ? 'flex min-h-0 flex-col overflow-hidden' : ''}>
        <div className={tab === 'config' ? '' : 'hidden'}>
          <ConfigTab />
        </div>
        <div
          className={tab === 'audit' ? 'flex min-h-0 min-w-0 flex-col overflow-hidden' : 'hidden'}
        >
          <AuditMessengerView jobId={auditJobId} setJobId={setAuditJobId} />
        </div>
      </CskhGlassPanel>
    </CskhPageShell>
  )
}
