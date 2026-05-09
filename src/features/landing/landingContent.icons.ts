import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Briefcase,
  Cpu,
  Globe2,
  GraduationCap,
  Repeat,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react'
import type { LandingIconName } from './landingContent.types'

export const LANDING_LUCIDE_BY_NAME: Record<LandingIconName, LucideIcon> = {
  Target,
  Sparkles,
  Award,
  Briefcase,
  GraduationCap,
  Share2,
  Repeat,
  TrendingUp,
  Globe2,
  Video,
  Cpu,
}

/** Thứ tự cố định cho dropdown chọn icon trên form CMS. */
export const LANDING_ICON_NAMES = Object.keys(LANDING_LUCIDE_BY_NAME) as LandingIconName[]

export function landingLucide(name: LandingIconName): LucideIcon {
  return LANDING_LUCIDE_BY_NAME[name] ?? Target
}
