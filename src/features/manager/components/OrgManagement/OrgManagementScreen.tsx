import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  ChevronDown,
  Briefcase,
  UserCircle2,
  Search,
  Users2,
} from 'lucide-react'
import { managerApi } from '@/features/manager/api'
import { managerKeys } from '@/features/manager/queryKeys'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Input } from '@/components/ui/input'

type OrgItem = { id: string; name: string }

// ─── Inline name editor (for VTCM chips & team headers) ─────────────
function InlineEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string
  onSave: (v: string) => void
  onCancel: () => void
}) {
  const { control, handleSubmit } = useForm<{ value: string }>({ defaultValues: { value } })
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={handleSubmit((v) => onSave(v.value.trim()))}
    >
      <Controller
        control={control}
        name="value"
        render={({ field }) => (
          <Input
            autoFocus
            className="h-8 rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            {...field}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel()
            }}
          />
        )}
      />
      <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded p-1 text-gray-400 hover:bg-gray-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  )
}

// ─── Team Accordion Item ─────────────────────────────────────────────
function TeamAccordion({
  team,
  depts,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
}: {
  team: OrgItem
  depts: OrgItem[]
  isOpen: boolean
  onToggle: () => void
  onUpdate: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const searchForm = useForm<{ search: string }>({ defaultValues: { search: '' } })
  const search = useWatch({ control: searchForm.control, name: 'search' }) ?? ''

  const { data: empData, isLoading } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: async () => {
      const { employeeApi } = await import('@/features/hr-admin/api')
      return employeeApi.getAll({ page: 1, pageSize: 200, teamId: team.id })
    },
    enabled: isOpen,
    staleTime: 30_000,
  })

  const members = empData?.data ?? []
  const filtered = search.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : members

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-5 py-3.5"
        onClick={() => {
          if (!editing) onToggle()
        }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Building2 className="h-5 w-5" />
        </div>

        {editing ? (
          <InlineEditor
            value={team.name}
            onSave={async (v) => {
              if (v && v !== team.name) await onUpdate(team.id, v)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900">{team.name}</h3>
            {isOpen && !isLoading && (
              <p className="text-xs text-gray-500">{members.length} thành viên</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
            title="Sửa tên"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Xoá nhóm này? Nhân sự sẽ bị gỡ cấu hình nhóm.')) onDelete(team.id)
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Xoá"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <ChevronDown
          className={[
            'h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
        />
      </div>

      {/* Expanded Body */}
      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Search bar (show if > 5 members) */}
          {members.length > 5 && (
            <div className="border-b border-gray-50 px-5 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <Controller
                  control={searchForm.control}
                  name="search"
                  render={({ field }) => (
                    <Input
                      placeholder="Tìm thành viên..."
                      className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
          )}

          <div className="px-5 py-3">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-gray-400">Đang tải...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                <UserCircle2 className="h-8 w-8 text-gray-200" />
                <span className="text-sm">
                  {search ? 'Không tìm thấy thành viên' : 'Chưa có thành viên nào'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((emp) => {
                  const dept = depts.find((d) => d.id === emp.departmentId)
                  return (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 transition-colors hover:bg-white hover:shadow-sm"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow-sm">
                        {emp.name
                          .split(' ')
                          .slice(-2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{emp.name}</p>
                        {/* VTCM badge */}
                        {dept ? (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-700">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dept.name}</span>
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block text-xs italic text-gray-400">
                            Chưa có VTCM
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────
export function OrgManagementScreen() {
  const qc = useQueryClient()
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set())
  const [addingTeam, setAddingTeam] = useState(false)
  const addTeamForm = useForm<{ teamVal: string }>({ defaultValues: { teamVal: '' } })

  const toggleTeam = (id: string) => {
    setOpenTeams((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Departments (VTCM) ---
  const { data: depts = [] } = useQuery({
    queryKey: managerKeys.departments(),
    queryFn: managerApi.getDepartments,
  })

  // --- Teams ---
  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: managerKeys.teams(),
    queryFn: managerApi.getTeams,
  })
  const createTeam = useMutation({
    mutationFn: managerApi.createTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: managerKeys.teams() }),
  })
  const updateTeam = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => managerApi.updateTeam(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: managerKeys.teams() }),
  })
  const deleteTeam = useMutation({
    mutationFn: managerApi.deleteTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: managerKeys.teams() }),
  })

  return (
    <div className="flex h-full flex-col bg-gray-50/50">
      <PageHeader
        title="Đơn vị & Nhóm"
        description="Quản lý đội nhóm trong tổ chức. Ấn vào nhóm để xem thành viên và vị trí chuyên môn của từng người."
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* ── Section: Nhóm (Teams) — accordion ──────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Users2 className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-gray-800">Nhóm (Teams)</h2>
                {!loadingTeams && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {teams.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingTeam(true)
                  addTeamForm.reset({ teamVal: '' })
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm nhóm
              </button>
            </div>

            {loadingTeams ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Đang tải...
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <TeamAccordion
                    key={team.id}
                    team={team}
                    depts={depts}
                    isOpen={openTeams.has(team.id)}
                    onToggle={() => toggleTeam(team.id)}
                    onUpdate={async (id, name) => {
                      await updateTeam.mutateAsync({ id, name })
                    }}
                    onDelete={async (id) => {
                      await deleteTeam.mutateAsync(id)
                    }}
                  />
                ))}

                {addingTeam && (
                  <form
                    className="flex items-center gap-2 rounded-xl border border-primary-300 bg-primary-50 px-5 py-3"
                    onSubmit={addTeamForm.handleSubmit(async (values) => {
                      const trimmed = values.teamVal.trim()
                      if (!trimmed) return
                      await createTeam.mutateAsync(trimmed)
                      setAddingTeam(false)
                    })}
                  >
                    <Building2 className="h-5 w-5 text-primary-400 shrink-0" />
                    <Controller
                      control={addTeamForm.control}
                      name="teamVal"
                      render={({ field }) => (
                        <Input
                          autoFocus
                          placeholder="Tên nhóm mới..."
                          className="h-auto flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                          {...field}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setAddingTeam(false)
                          }}
                        />
                      )}
                    />
                    <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50">
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingTeam(false)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {teams.length === 0 && !addingTeam && (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm italic text-gray-400">
                    Chưa có nhóm nào. Bấm "Thêm nhóm" để bắt đầu.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
