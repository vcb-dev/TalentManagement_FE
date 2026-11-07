import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { ErrorState } from '@/components/shared/ErrorState'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/axios'
import { activityStatus, pickSpotlight, vnMonthOf } from '../activityTime'
import { useDeleteActivity, useMonthActivities } from '../hooks'
import type { ActivityMonth, CompanyActivity } from '../types'
import { ActivityFormDialog } from './ActivityFormDialog'
import { ActivityHero } from './ActivityHero'
import {
  LedgerAddRow,
  LedgerMessage,
  LedgerOrnament,
  LedgerPanel,
  LedgerRow,
  LedgerSheet,
  LedgerSkeletonRows,
} from './ActivityLedger'
import { ActivitySpotlight } from './ActivitySpotlight'

const FLASH_MS = 1800

function activitySummary(activities: CompanyActivity[]): string {
  const ongoing = activities.filter((a) => activityStatus(a) === 'ongoing').length
  const total = `${activities.length} hoạt động`
  return ongoing > 0 ? `${total} · ${ongoing} đang diễn ra` : total
}

/**
 * Trang "Hoạt động trong tháng". Mọi nhân sự xem; có `activity.manage` thì thêm / sửa / xoá ngay trên trang.
 */
export function ActivitiesScreen({
  month,
  onMonthChange,
}: {
  month: ActivityMonth
  onMonthChange: (month: ActivityMonth) => void
}) {
  const { canId } = usePermission()
  const canManage = canId('activity.manage')
  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMonthActivities(month)
  const deleteActivity = useDeleteActivity()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CompanyActivity | null>(null)
  const [deleting, setDeleting] = useState<CompanyActivity | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flashId])

  const ready = !isLoading && !isError
  const spotlight = ready ? pickSpotlight(activities) : null
  const openCreate = () => setCreating(true)

  /** Hoạt động vừa lưu có thể thuộc tháng khác — chuyển tới đó để người sửa thấy kết quả. */
  const showSaved = (saved: CompanyActivity) => onMonthChange(vnMonthOf(saved.startAt))

  const jumpToActivity = (activity: CompanyActivity) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(`activity-${activity.id}`)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    setFlashId(activity.id)
  }

  return (
    <>
      <LedgerSheet>
        <ActivityHero
          month={month}
          summary={ready ? activitySummary(activities) : null}
          activities={ready ? activities : []}
          spotlightBelow={spotlight !== null}
          onMonthChange={onMonthChange}
          onSelectActivity={jumpToActivity}
          onAdd={canManage ? openCreate : undefined}
        />

        {spotlight ? <ActivitySpotlight activity={spotlight} /> : null}

        <LedgerOrnament label={`Tất cả hoạt động tháng ${month.month}/${month.year}`} />

        {isError ? (
          <LedgerPanel>
            <ErrorState
              title="Không tải được danh sách hoạt động"
              description={getApiErrorMessage(error)}
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          </LedgerPanel>
        ) : null}

        {isLoading ? <LedgerSkeletonRows /> : null}

        {ready && activities.length === 0 ? (
          <LedgerMessage title={`Tháng ${month.month}/${month.year} chưa có hoạt động nào`}>
            {canManage
              ? 'Thêm hoạt động để nhân sự xem được thời gian và địa điểm.'
              : 'Hoạt động sẽ hiện ở đây khi được thêm.'}
          </LedgerMessage>
        ) : null}

        {ready && activities.length > 0 ? (
          <ol role="list" key={`${month.year}-${month.month}`}>
            {activities.map((activity, index) => (
              <LedgerRow
                key={activity.id}
                index={index}
                activity={activity}
                canManage={canManage}
                flashing={flashId === activity.id}
                onEdit={() => setEditing(activity)}
                onDelete={() => setDeleting(activity)}
              />
            ))}
          </ol>
        ) : null}

        {ready && canManage ? (
          <LedgerAddRow nextIndex={activities.length} onClick={openCreate} />
        ) : null}
      </LedgerSheet>

      {canManage ? (
        <>
          <ActivityFormDialog open={creating} onOpenChange={setCreating} onSaved={showSaved} />
          <ActivityFormDialog
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            activity={editing}
            onSaved={showSaved}
          />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={`Xoá hoạt động "${deleting?.title ?? ''}"?`}
            description="Nhân sự sẽ không còn thấy hoạt động này. Không thể hoàn tác."
            confirmLabel="Xoá"
            destructive
            onConfirm={() => {
              if (deleting) deleteActivity.mutate(deleting.id)
              setDeleting(null)
            }}
          />
        </>
      ) : null}
    </>
  )
}
