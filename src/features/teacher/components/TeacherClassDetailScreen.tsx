import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmployeeAvatar } from '@/components/shared/EmployeeAvatar'

const MOCK_MEMBERS = [
  { id: '1', name: 'Nguyễn Văn A', email: 'a@vcb.com' },
  { id: '2', name: 'Trần Thị B', email: 'b@vcb.com' },
]

export function TeacherClassDetailScreen({ classId }: { classId: string }) {
  const title =
    classId === 'c1'
      ? 'Lớp Tập sự — Kỳ Q1/2026'
      : classId === 'c2'
        ? 'Lớp Biết việc — Nhóm A'
        : `Lớp ${classId}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/teacher/classes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách lớp
      </Link>
      <PageHeader
        title={title}
        description="Thông tin đầy đủ thành viên trong lớp — lịch sử thi từng người sẽ mở từ đây (nối API)."
      />
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Nhân viên</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Kết quả thi (lớp)</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MEMBERS.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EmployeeAvatar name={m.name} className="h-8 w-8 text-xs" />
                    {m.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
