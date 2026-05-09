export type LandingIconName =
  | 'Target'
  | 'Sparkles'
  | 'Award'
  | 'Briefcase'
  | 'GraduationCap'
  | 'Share2'
  | 'Repeat'
  | 'TrendingUp'
  | 'Globe2'
  | 'Video'
  | 'Cpu'

export interface LandingLeaderEntry {
  name: string
  role: string
  photo: string
  bullets: string[]
}

export interface LandingEcosystemItem {
  label: string
  desc: string
}

export interface LandingStrategicPillar {
  label: string
  desc: string
}

export interface LandingBrandPillar {
  icon: LandingIconName
  text: string
}

export interface LandingOverviewStat {
  icon: LandingIconName
  label: string
  desc: string
}

/** Dữ liệu nội dung serialize được cho trang `/` (merge với patch từ API). */
export interface CompanyLandingContent {
  header: {
    brandName: string
    navVisionMission: string
    navEcosystem: string
    navIntroduction: string
    navStrategy: string
    navLeadership: string
  }
  hero: {
    badge: string
    titleLine1Before: string
    titleLine1Highlight: string
    titleLine2Before: string
    titleLine2Highlight: string
    subtitle: string
    exploreCta: string
    teamImageSrc: string
    teamImageAlt: string
  }
  visionMissionSection: {
    kicker: string
    kickerIcon: LandingIconName
    title: string
    subtitle: string
  }
  vision: {
    icon: LandingIconName
    title: string
    lead: string
    subHeading: string
    points: string[]
  }
  mission: {
    icon: LandingIconName
    title: string
    points: string[]
    closing: string
  }
  ecosystem: {
    sectionTitle: string
    items: LandingEcosystemItem[]
    artisanBanner: { precision: string; leather: string }
    artisanAltPrecision: string
    artisanAltLeather: string
  }
  introduction: {
    sectionTitle: string
    paragraphs: string[]
  }
  strategy: {
    sectionTitle: string
    bannerQuote: string
    traditionalImageSrc: string
    traditionalImageAlt: string
    pillars: LandingStrategicPillar[]
  }
  leadership: {
    badge: string
    badgeIcon: LandingIconName
    sectionTitle: string
    leaders: LandingLeaderEntry[]
  }
  overview: {
    socialBannerSrc: string
    socialBannerAlt: string
    videoStatValue: string
    videoStatLine1: string
    videoStatLine2: string
    sectionKicker: string
    sectionTitle: string
    leadParagraph: string
    brandIntro: string
    brandPillars: LandingBrandPillar[]
    closingParagraph: string
    stats: LandingOverviewStat[]
  }
  cta: {
    title: string
    body: string
    secondaryButton: string
  }
  footer: {
    copyrightRest: string
    linkIntro: string
    linkLeadership: string
    linkHomePrefix: string
  }
}
