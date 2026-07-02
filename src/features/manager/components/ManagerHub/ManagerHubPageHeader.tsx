import type { ReactNode } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'

export interface ManagerHubPageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}

export function ManagerHubPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: ManagerHubPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={actions}
      eyebrow={eyebrow}
      variant="flat"
      gradientTitle
      className="pb-0"
    />
  )
}
