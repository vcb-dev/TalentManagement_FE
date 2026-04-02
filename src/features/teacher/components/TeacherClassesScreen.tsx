import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { CARD_ENTRANCE_HOVER } from '@/lib/cardMotion'
import { cn } from '@/lib/utils'

/** Lớp được Manager phân — dữ liệu sẽ nối API. */
const MOCK_CLASSES = [
  { id: 'c1', name: 'Lớp Tập sự — Kỳ Q1/2026', memberCount: 12, examPeriod: 'Kỳ thi Tập sự → Biết việc' },
  { id: 'c2', name: 'Lớp Biết việc — Nhóm A', memberCount: 8, examPeriod: 'Kỳ thi Biết việc' },
]

export function TeacherClassesScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Lớp được phân công"
        description="Xem danh sách lớp Manager đã xếp và thành viên trong từng lớp (theo từng kỳ thi)."
      />
      <ul className="space-y-3">
        {MOCK_CLASSES.map((c) => (
          <li key={c.id}>
            <Link
              to="/teacher/classes/$classId"
              params={{ classId: c.id }}
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30',
                CARD_ENTRANCE_HOVER
              )}
            >
              <div>
                <div className="font-semibold text-foreground">{c.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.examPeriod}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {c.memberCount} thành viên
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
