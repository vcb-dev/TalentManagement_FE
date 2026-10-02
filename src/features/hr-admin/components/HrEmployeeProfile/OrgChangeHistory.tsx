import { useEmployeeOrgChanges } from '@/features/hr-admin/hooks'

function displayValue(value: string | null) {
  return value?.trim() ? value : 'Chưa chọn'
}

export function OrgChangeHistory({ employeeId }: { employeeId: string }) {
  const query = useEmployeeOrgChanges(employeeId)

  return (
    <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Lịch sử phòng ban, nhóm, vị trí chuyên môn
      </p>
      {query.isLoading ? <p className="text-sm text-slate-400">Đang tải lịch sử...</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive">Không tải được lịch sử thay đổi.</p>
      ) : null}
      {query.data && query.data.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có thay đổi.</p>
      ) : null}
      {query.data && query.data.length > 0 ? (
        <ul className="space-y-3">
          {query.data.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-100 px-4 py-3 text-sm dark:border-slate-800"
            >
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {row.fieldLabel}: {displayValue(row.fromLabel)} → {displayValue(row.toLabel)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {row.changedByName ?? 'Không rõ người đổi'} ·{' '}
                {new Date(row.changedAt).toLocaleString('vi-VN')}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
