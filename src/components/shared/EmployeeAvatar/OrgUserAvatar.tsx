import { EmployeeAvatar } from './EmployeeAvatar'
import { resolvePublicAssetUrl } from '@/lib/publicAssetUrl'
import { cn } from '@/lib/utils'

/** Avatar nhân sự trong org (danh sách nhóm, modal thêm thành viên). */
export function OrgUserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl?: string | null
  className?: string
}) {
  return (
    <EmployeeAvatar
      name={name}
      photoUrl={resolvePublicAssetUrl(avatarUrl)}
      className={cn('h-9 w-9 rounded-full text-xs shadow-none ring-1 ring-border', className)}
      fallbackClassName="bg-gradient-to-br from-primary/25 to-primary/5 font-semibold text-primary"
    />
  )
}
