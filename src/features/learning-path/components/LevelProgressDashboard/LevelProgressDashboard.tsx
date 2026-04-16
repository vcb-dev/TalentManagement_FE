import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface LevelProgressDashboardProps {
  levelTitle: string
  summary?: string
}

export function LevelProgressDashboard({ levelTitle, summary }: LevelProgressDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">{levelTitle}</CardTitle>
      </CardHeader>
      {summary ? (
        <CardContent className="text-sm text-muted-foreground">{summary}</CardContent>
      ) : null}
    </Card>
  )
}
