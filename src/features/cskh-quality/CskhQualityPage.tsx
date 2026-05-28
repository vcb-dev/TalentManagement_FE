import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Link2, CheckCircle2 } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'

const cskhQualityRoute = getRouteApi('/_protected/cskh-quality')
import { fetchCskhPages, fetchRunningCskhJob, getCskhOAuthStartUrl, refreshCskhOAuth } from './api'
import { AuditMessengerView } from './AuditMessengerView'
import { CskhGlassPanel, CskhPageShell, CskhPageAvatar } from './cskhUi'

const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function ConfigTab() {
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cskh', 'pages'],
    queryFn: fetchCskhPages,
  })

  const refreshMut = useMutation({
    mutationFn: refreshCskhOAuth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cskh'] }),
  })

  const pages = data?.pages ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-indigo-500" /> Đang tải cấu hình…
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div>
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
                Cập nhật kết nối Facebook
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Facebook Pages</h3>
          {pages.length ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {pages.length.toLocaleString('vi-VN')} Page đã kết nối — chọn kênh khi chấm điểm ở tab
              Chấm điểm.
            </p>
          ) : null}
        </div>

        {!pages.length ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Chưa có Page — kết nối Facebook ở trên.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pages.map((p) => (
              <li key={p.pageId} className="flex items-center gap-3 px-5 py-4">
                <CskhPageAvatar
                  name={p.pageName || p.pageId}
                  pictureUrl={p.pagePictureUrl}
                  pageId={p.pageId}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{p.pageName || p.pageId}</p>
                  <p className="truncate text-xs text-slate-400">ID: {p.pageId}</p>
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

export function CskhQualityPage() {
  const { tab: tabParam } = cskhQualityRoute.useSearch()
  const tab = tabParam === 'config' ? 'config' : 'audit'
  const [auditJobBusy, setAuditJobBusy] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('tab') === 'monitor') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'audit')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob('audit')
        setAuditJobBusy(running?.status === 'running')
        if (running?.status !== 'running') {
          sessionStorage.removeItem(AUDIT_JOB_KEY)
        }
      } catch {
        setAuditJobBusy(false)
        sessionStorage.removeItem(AUDIT_JOB_KEY)
      }
    })()
    const p = new URLSearchParams(window.location.search)
    if (p.get('fb_connected') || p.get('oauth_error')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('fb_connected')
      url.searchParams.delete('oauth_error')
      if (p.get('tab') === 'monitor') url.searchParams.set('tab', 'audit')
      if (!url.searchParams.get('tab')) url.searchParams.set('tab', 'config')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  return (
    <CskhPageShell className={tab === 'config' ? '!h-auto flex-none' : undefined}>
      {auditJobBusy && tab === 'audit' ? (
        <p className="mb-2 text-xs font-medium text-indigo-600">Đang quét và chấm điểm…</p>
      ) : null}

      <CskhGlassPanel
        className={
          tab === 'audit'
            ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden'
            : 'min-h-0 overflow-visible'
        }
      >
        <div className={tab === 'config' ? 'min-h-0' : 'hidden'}>
          <ConfigTab />
        </div>
        <div
          className={
            tab === 'audit'
              ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
              : 'hidden'
          }
        >
          <AuditMessengerView onAuditJobActiveChange={setAuditJobBusy} />
        </div>
      </CskhGlassPanel>
    </CskhPageShell>
  )
}
