const DASHBOARD_URL = import.meta.env.VITE_CSKH_DASHBOARD_URL?.trim() || 'http://localhost:5555'

/** Nhúng CSKH Quality Dashboard (scraper Cloud Run / local) trong shell HRM. */
export function CskhQualityPage() {
  return (
    <section
      className="-m-5 flex min-h-[calc(100dvh-5.5rem)] flex-col md:-m-6"
      aria-label="CSKH Quality Dashboard"
    >
      <iframe
        src={DASHBOARD_URL}
        title="CSKH Quality — Sapo Social Inbox"
        className="min-h-0 w-full flex-1 rounded-lg border border-slate-200/80 bg-white shadow-sm"
        allow="clipboard-read; clipboard-write"
      />
    </section>
  )
}
