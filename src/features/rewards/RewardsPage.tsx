import React, { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/axios'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import {
  Award,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
  Edit,
  LayoutGrid,
  ChevronUp,
  User,
  History,
  AlertTriangle,
  TrendingUp,
  X,
} from 'lucide-react'
import { CustomSelect } from '@/components/shared/CustomSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'

type Rule = {
  id: string
  teamId?: string | null
  category: string
  type: 'REWARD' | 'PENALTY'
  title: string
  amount?: number | null
  note?: string | null
  team?: { name: string } | null
}

type RecordEntity = {
  id: string
  userId: string
  kind: 'REWARD' | 'PENALTY'
  title: string
  amount?: number | null
  note?: string | null
  createdAt: string
  user: {
    fullNameLegal: string
    email: string
    team?: { name: string }
  }
  createdBy: {
    fullNameLegal: string
  }
  rule?: Rule | null
}

type Employee = {
  id: string
  fullNameLegal: string
  name?: string
  email: string
  teamId?: string | null
  teamIds?: string[]
  teamNames?: string[]
}

const CATEGORY_MAPPING: Record<string, string> = {
  GENERAL: 'CHUNG',
  CHUNG: 'CHUNG',
  'THƯỞNG PHÒNG KD': 'KINH DOANH',
  'THUONG PHONG KD': 'KINH DOANH',
  'PHÒNG KINH DOANH': 'KINH DOANH',
  'KINH DOANH': 'KINH DOANH',
  KINH_DOANH: 'KINH DOANH',
  'SALE CSKH': 'SALE CSKH',
  HÀNH_CHÍNH: 'HÀNH CHÍNH',
  'HÀNH CHÍNH': 'HÀNH CHÍNH',
  'THƯỞNG TRAFFIC': 'EDITOR',
  'THUONG TRAFFIC': 'EDITOR',
  THƯỞNG_TRAFFIC: 'EDITOR',
  LIVESTREAM: 'LIVESTREAM',
  TMĐT: 'TMĐT',
  TMDT: 'TMĐT',
  'KẾ TOÁN': 'KẾ TOÁN',
  'KE TOAN': 'KẾ TOÁN',
  'CỬA HÀNG': 'CỬA HÀNG',
  'CUA HANG': 'CỬA HÀNG',
  SHOWROOM: 'CỬA HÀNG',
  LOGISTIC: 'LOGISTIC',
  'SẢN XUẤT': 'SẢN XUẤT',
  'SAN XUAT': 'SẢN XUẤT',
  'VẬN ĐƠN': 'VẬN ĐƠN',
  'VAN DON': 'VẬN ĐƠN',
  TECH: 'CÔNG NGHỆ',
  'CÔNG NGHỆ': 'CÔNG NGHỆ',
}

const HIDDEN_CATEGORIES: string[] = []

const getDisplayCategory = (cat: string) => {
  const normalized = cat.toUpperCase().replace(/_/g, ' ')
  return CATEGORY_MAPPING[normalized] || normalized
}

export default function RewardsPage() {
  const currentUser = useAuthStore((s) => s.user)
  const isPrivileged =
    currentUser?.role === 'HR' || currentUser?.role === 'BOD' || currentUser?.role === 'MANAGER'

  // Main Tabs (Persona Tabs removed by request)
  const [adminSubTab, setAdminSubTab] = useState<'log' | 'catalog' | 'history'>('log')
  const [mySubTab, setMySubTab] = useState<'history' | 'catalog'>('history')

  // Rule Category Tab
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<string>('CHUNG')

  // UI States
  const [rewardsExpanded, setRewardsExpanded] = useState(true)
  const [penaltiesExpanded, setPenaltiesExpanded] = useState(true)
  const [catalogRewardsFull, setCatalogRewardsFull] = useState(false)
  const [catalogPenaltiesFull, setCatalogPenaltiesFull] = useState(false)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  // Data states
  const [myRecords, setMyRecords] = useState<RecordEntity[]>([])
  const [allRecords, setAllRecords] = useState<RecordEntity[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Loading states
  const [loading, setLoading] = useState(true)

  // Filter states
  const [teamSearch, setTeamSearch] = useState<string>('')
  const [logTeamFilter, setLogTeamFilter] = useState<string>('all')

  // Action States
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [actionKind, setActionKind] = useState<'REWARD' | 'PENALTY'>('PENALTY')
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set())
  const [appliedRuleIds, setAppliedRuleIds] = useState<Set<string>>(new Set())
  const [customNote, setCustomNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [historySearch, setHistorySearch] = useState<string>('')
  const [historyTeamFilter, setHistoryTeamFilter] = useState<string>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const itemsPerPage = 6

  // Member search
  const [memberRuleSearch, setMemberRuleSearch] = useState('')

  // Rule CRUD Modal
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState({
    teamId: '',
    category: '',
    type: 'PENALTY' as 'REWARD' | 'PENALTY',
    title: '',
    amount: 0,
    note: '',
  })

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const rulesUrl = isPrivileged ? '/reward/rules' : '/reward/my-rules'
      const rulesRes = await apiClient.get<Rule[]>(rulesUrl)
      setRules(rulesRes.data || [])

      if (isPrivileged) {
        const employeesRes = await apiClient.get<any>('/employees?pageSize=3000')
        setEmployees(employeesRes.data?.data || [])

        const recordsRes = await apiClient.get<RecordEntity[]>('/reward/records')
        setAllRecords(recordsRes.data || [])
      }

      const myRes = await apiClient.get<RecordEntity[]>('/reward/my-records')
      setMyRecords(myRes.data || [])
    } catch (error) {
      console.error('Failed to fetch rewards data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [isPrivileged])

  // Auto-expand teams when searching or filtering
  useEffect(() => {
    if (teamSearch.trim() || logTeamFilter !== 'all') {
      const matchingIds = Object.keys(filteredTeamGroups)
      setExpandedTeams((prev) => {
        const next = new Set(prev)
        matchingIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [teamSearch, logTeamFilter])

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, { name: string; members: any[] }> = {}
    if (!Array.isArray(employees)) return groups
    employees.forEach((emp: any) => {
      const rawIds = Array.isArray(emp.teamIds) ? emp.teamIds.filter((id: string) => !!id) : []
      const tIds = rawIds.length > 0 ? rawIds : ['no-team']
      const tNames = emp.teamNames && emp.teamNames.length > 0 ? emp.teamNames : ['CHƯA GÁN TEAM']

      tIds.forEach((tid: string, idx: number) => {
        const tName = tNames[idx] || tNames[0] || 'CHƯA GÁN TEAM'
        if (!groups[tid]) groups[tid] = { name: tName, members: [] }
        // Tránh trùng lặp trong cùng 1 team (nếu dữ liệu bị trùng)
        if (!groups[tid].members.find((m) => m.id === emp.id)) {
          groups[tid].members.push(emp)
        }
      })
    })
    return groups
  }, [employees])

  const filteredTeamGroups = useMemo(() => {
    let baseGroups = groupedEmployees

    // Filter by Dropdown first
    if (logTeamFilter !== 'all') {
      const filtered: Record<string, { name: string; members: Employee[] }> = {}
      if (baseGroups[logTeamFilter]) {
        filtered[logTeamFilter] = baseGroups[logTeamFilter]
      }
      baseGroups = filtered
    }

    if (!teamSearch) return baseGroups

    const filtered: Record<string, { name: string; members: Employee[] }> = {}
    const searchLow = teamSearch.toLowerCase().replace(/\s/g, '')
    Object.entries(baseGroups).forEach(([tid, group]) => {
      const groupNameLow = group.name.toLowerCase().replace(/\s/g, '')
      const matchesTeam = groupNameLow.includes(searchLow)
      const matchingMembers = group.members.filter((m) => {
        const memberNameLow = (m.name || '').toLowerCase().replace(/\s/g, '')
        return memberNameLow.includes(searchLow)
      })
      if (matchesTeam || matchingMembers.length > 0) {
        filtered[tid] = {
          name: group.name,
          members: matchesTeam ? group.members : matchingMembers,
        }
      }
    })
    return filtered
  }, [groupedEmployees, teamSearch, logTeamFilter])

  const detectCategoryFromTeam = (teamName: string) => {
    const name = teamName.toUpperCase()
    if (name.includes('HUYK') || name.includes('GLOBAL')) return 'TRAFFIC'
    if (name.includes('TMĐT') || name.includes('TMDT')) return 'TMĐT'
    if (name.includes('LIVESTREAM')) return 'LIVESTREAM'
    if (name.includes('KINH DOANH')) return 'KINH DOANH'
    if (name.includes('LOGISTIC')) return 'LOGISTIC'
    if (name.includes('SẢN XUẤT') || name.includes('SAN XUAT') || name.includes('XƯỞNG'))
      return 'SẢN XUẤT'
    if (name.includes('VẬN ĐƠN') || name.includes('VAN DON')) return 'VẬN ĐƠN'
    if (name.includes('CỬA HÀNG') || name.includes('SHOWROOM') || name.includes('CUA HANG'))
      return 'CỬA HÀNG'
    if (name.includes('ADS')) return 'ADS'
    if (name.includes('MEDIA')) return 'MEDIA'
    if (name.includes('EDITOR')) return 'EDITOR'
    if (name.includes('TECH') || name.includes('CÔNG NGHỆ')) return 'TECH'
    if (name.includes('KẾ TOÁN') || name.includes('KE TOAN')) return 'KẾ TOÁN'
    if (name.includes('HÀNH CHÍNH')) return 'HÀNH CHÍNH'
    return 'CHUNG'
  }

  const handleOpenAction = (emp: any, kind: 'REWARD' | 'PENALTY') => {
    setSelectedEmp(emp)
    setActionKind(kind)

    // Find already recorded rules for this employee
    const recorded = allRecords
      .filter((r) => r.userId === emp.id)
      .map((r) => r.rule?.id)
      .filter(Boolean) as string[]

    const recordedSet = new Set(recorded)
    setAppliedRuleIds(recordedSet)
    setSelectedRuleIds(new Set(recorded))
    setCustomNote('')

    const teamName = emp.teamNames && emp.teamNames.length > 0 ? emp.teamNames[0] : null
    if (teamName) {
      const cat = detectCategoryFromTeam(teamName)
      setSelectedRuleCategory(cat !== 'TRAFFIC' ? cat : 'CHUNG')
    } else {
      setSelectedRuleCategory('CHUNG')
    }

    setShowActionPanel(true)
  }

  const handleToggleRule = (rid: string) => {
    const next = new Set(selectedRuleIds)
    if (next.has(rid)) next.delete(rid)
    else next.add(rid)
    setSelectedRuleIds(next)
  }

  const handleSubmitActions = async () => {
    if (!selectedEmp || selectedRuleIds.size === 0) return
    setSubmitting(true)
    try {
      // Only post NEWLY selected rules
      const newRuleIds = Array.from(selectedRuleIds).filter((id) => !appliedRuleIds.has(id))
      const ruleList = rules.filter((r) => newRuleIds.includes(r.id))

      if (ruleList.length === 0) {
        setShowActionPanel(false)
        return
      }

      await Promise.all(
        ruleList.map((rule) =>
          apiClient.post('/reward/records', {
            userId: selectedEmp.id,
            kind: rule.type,
            title: rule.title,
            amount: Number(rule.amount || 0),
            note: customNote || rule.note,
            ruleId: rule.id,
          })
        )
      )
      setShowActionPanel(false)
      await fetchData(true)
      toast.success(
        `Đã ghi nhận ${selectedRuleIds.size} nội dung cho ${selectedEmp.name || selectedEmp.fullNameLegal}`
      )
    } catch (error) {
      console.error('Failed to submit rewards:', error)
      toast.error('Có lỗi xảy ra khi ghi nhận.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    const promise = apiClient.delete(`/reward/rules/${id}`)

    toast.promise(promise, {
      loading: 'Đang xóa quy định...',
      success: () => {
        setDeleteConfirmId(null)
        fetchData(true)
        return 'Đã xóa quy định thành công'
      },
      error: 'Không thể xóa quy định này',
    })
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      ...ruleForm,
      teamId: ruleForm.teamId || null,
      amount: Number(ruleForm.amount),
    }

    const promise = editingRuleId
      ? apiClient.patch(`/reward/rules/${editingRuleId}`, payload)
      : apiClient.post('/reward/rules', payload)

    toast.promise(promise, {
      loading: editingRuleId ? 'Đang cập nhật...' : 'Đang tạo mới...',
      success: () => {
        setShowRuleModal(false)
        fetchData(true)
        return editingRuleId ? 'Đã cập nhật quy chuẩn' : 'Đã thêm quy chuẩn mới'
      },
      error: 'Lỗi khi lưu quy chuẩn',
      finally: () => setSubmitting(false),
    })
  }

  const myTotalRewards = myRecords
    .filter((r) => r.kind === 'REWARD')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const myTotalPenalties = myRecords
    .filter((r) => r.kind === 'PENALTY')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const myNetBalance = myTotalRewards - myTotalPenalties

  const excelTabs = useMemo(() => {
    return Array.from(
      new Set(
        rules
          .filter((r) => !HIDDEN_CATEGORIES.includes(r.category.toUpperCase().replace(/_/g, ' ')))
          .map((r) => getDisplayCategory(r.category))
      )
    ).sort((a, b) => (a === 'CHUNG' ? -1 : b === 'CHUNG' ? 1 : a.localeCompare(b)))
  }, [rules])

  const memberTabs = useMemo(() => {
    if (isPrivileged) return excelTabs

    const userTeamIds = currentUser?.teamIds || []
    const categoriesFromRules = rules
      .filter((r) => r.teamId && userTeamIds.includes(r.teamId))
      .map((r) => getDisplayCategory(r.category))

    const userTeamCategory = currentUser?.team
      ? getDisplayCategory(detectCategoryFromTeam(currentUser.team))
      : null

    const allowedCategories = new Set(['CHUNG'])
    categoriesFromRules.forEach((c) => allowedCategories.add(c))
    if (userTeamCategory) allowedCategories.add(userTeamCategory)

    return excelTabs.filter((tab) => allowedCategories.has(tab))
  }, [excelTabs, isPrivileged, currentUser, rules])

  const activeCategoryRules = useMemo(() => {
    return rules.filter((r) => {
      const displayCat = getDisplayCategory(r.category)
      if (r.type === 'PENALTY') return displayCat === selectedRuleCategory
      if (r.type === 'REWARD') {
        if (selectedRuleCategory === 'TMĐT') return displayCat === 'TMĐT'
        if (selectedRuleCategory === 'LIVESTREAM')
          return displayCat === 'LIVESTREAM' || displayCat === 'KINH DOANH'
        return displayCat === selectedRuleCategory
      }
      return false
    })
  }, [rules, selectedRuleCategory])

  const filteredActionRules = activeCategoryRules.filter((r) => r.type === actionKind)

  const myTeamRules = useMemo(() => {
    if (!currentUser) return []
    // Use teamIds from session first, fallback to employee search if session is missing it
    const userTeamIds =
      currentUser.teamIds && currentUser.teamIds.length > 0
        ? currentUser.teamIds
        : employees.find((e) => e.email.toLowerCase() === currentUser.email.toLowerCase())
            ?.teamIds || []

    return rules.filter((r) => {
      const isGeneral =
        !r.teamId ||
        r.category.toUpperCase() === 'GENERAL' ||
        r.category.toUpperCase() === 'CHUNG' ||
        !r.team

      if (isGeneral) return true
      return !!r.teamId && userTeamIds.includes(r.teamId)
    })
  }, [rules, currentUser, employees])

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="h-7 w-7 text-indigo-600" />
              Quản lý Khen thưởng/Phạt
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Hệ thống áp quy chuẩn theo Team và bộ phận VCB.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-slate-500 text-sm italic">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200">
              {isPrivileged ? (
                <>
                  <button
                    onClick={() => setAdminSubTab('log')}
                    className={`px-8 py-4 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2 ${adminSubTab === 'log' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <Users className="h-4 w-4" /> Ghi nhận theo Team
                  </button>
                  <button
                    onClick={() => setAdminSubTab('catalog')}
                    className={`px-8 py-4 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2 ${adminSubTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <LayoutGrid className="h-4 w-4" /> Danh mục quy chuẩn
                  </button>
                  <button
                    onClick={() => setAdminSubTab('history')}
                    className={`px-8 py-4 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2 ${adminSubTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <History className="h-4 w-4" /> Lịch sử hệ thống
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMySubTab('history')}
                    className={`px-8 py-4 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2 ${mySubTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <User className="h-4 w-4" /> Thưởng / Lỗi cá nhân
                  </button>
                  <button
                    onClick={() => setMySubTab('catalog')}
                    className={`px-8 py-4 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2 ${mySubTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <Award className="h-4 w-4" /> Danh mục Khen thưởng / Phạt
                  </button>
                </>
              )}
            </div>

            {!isPrivileged ? (
              /* MEMBER VIEW CONTENT */
              <div className="space-y-8 animate-fade-in">
                {mySubTab === 'history' ? (
                  <div className="space-y-6">
                    {/* Member Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                          <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">
                            Khen thưởng
                          </p>
                          <h3 className="text-xl font-black text-emerald-900">
                            +{myTotalRewards.toLocaleString()}đ
                          </h3>
                        </div>
                      </div>
                      <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center gap-4">
                        <div className="h-12 w-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-600 uppercase tracking-widest">
                            Vi phạm/Phạt
                          </p>
                          <h3 className="text-xl font-black text-rose-900">
                            -{myTotalPenalties.toLocaleString()}đ
                          </h3>
                        </div>
                      </div>
                      <div
                        className={`p-6 rounded-3xl border flex items-center gap-4 ${myNetBalance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'}`}
                      >
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white ${myNetBalance >= 0 ? 'bg-indigo-600' : 'bg-amber-600'}`}
                        >
                          <Award className="h-6 w-6" />
                        </div>
                        <div>
                          <p
                            className={`text-xs font-black uppercase tracking-widest ${myNetBalance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}
                          >
                            Tổng tích lũy
                          </p>
                          <h3
                            className={`text-xl font-black ${myNetBalance >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}
                          >
                            {myNetBalance >= 0 ? '+' : ''}
                            {myNetBalance.toLocaleString()}đ
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Member History Table */}
                    <div className="bg-white border rounded-3xl shadow-xl overflow-hidden">
                      <div className="px-8 py-5 border-b bg-slate-50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                          Lịch sử cá nhân
                        </h3>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 text-white text-xs font-black uppercase">
                          <tr>
                            <th className="py-5 px-8">Nội dung</th>
                            <th className="py-5 px-6">Số tiền</th>
                            <th className="py-5 px-6">Ghi chú</th>
                            <th className="py-5 px-8 text-right">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {myRecords.length > 0 ? (
                            myRecords.map((rec) => (
                              <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-5 px-8">
                                  <div className="font-bold text-slate-800">{rec.title}</div>
                                  <div
                                    className={`text-xs font-black uppercase mt-0.5 ${rec.kind === 'REWARD' ? 'text-emerald-500' : 'text-rose-500'}`}
                                  >
                                    {rec.kind === 'REWARD' ? 'Khen thưởng' : 'Phạt vi phạm'}
                                  </div>
                                </td>
                                <td
                                  className={`py-5 px-6 font-black ${rec.kind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                                >
                                  {rec.kind === 'REWARD' ? '+' : '-'}
                                  {Number(rec.amount || 0).toLocaleString()} đ
                                </td>
                                <td className="py-5 px-6 text-slate-500 text-xs italic">
                                  {rec.note || '-'}
                                </td>
                                <td className="py-5 px-8 text-slate-400 text-xs font-medium text-right">
                                  {new Date(rec.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-20 text-center text-slate-400 italic">
                                Chưa có dữ liệu khen thưởng/phạt.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Member Team Rules Catalog */
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-3xl border shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                          <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                            Quy chuẩn nội bộ Team
                          </h3>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Khung quy định thưởng phạt áp dụng
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                      {memberTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSelectedRuleCategory(tab)}
                          className={`px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${selectedRuleCategory === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-400 border-slate-50 hover:border-indigo-100 shadow-sm'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {['REWARD', 'PENALTY'].map((type) => {
                        const isTableExp = type === 'REWARD' ? rewardsExpanded : penaltiesExpanded
                        const setTableExp =
                          type === 'REWARD' ? setRewardsExpanded : setPenaltiesExpanded
                        const isFullView =
                          type === 'REWARD' ? catalogRewardsFull : catalogPenaltiesFull
                        const setFullView =
                          type === 'REWARD' ? setCatalogRewardsFull : setCatalogPenaltiesFull

                        const allItems = activeCategoryRules.filter((r) => r.type === type)
                        const displayItems = isFullView ? allItems : allItems.slice(0, 4)

                        return (
                          <div
                            key={type}
                            className="bg-white border rounded-3xl shadow-xl overflow-hidden"
                          >
                            <button
                              onClick={() => setTableExp(!isTableExp)}
                              className={`w-full px-8 py-5 border-b font-black text-xs uppercase flex items-center justify-between transition-colors ${isTableExp ? (type === 'REWARD' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100') : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-2">
                                {type === 'REWARD' ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                                <span>
                                  Danh mục {type === 'REWARD' ? 'Khen thưởng' : 'Phạt lỗi'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="opacity-40">{allItems.length} mục</span>
                                {isTableExp ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </button>

                            {isTableExp && (
                              <div className="overflow-x-auto animate-fade-in">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 text-xs font-black text-slate-400 uppercase border-b">
                                      <th className="py-4 px-8">Quy chuẩn</th>
                                      <th className="py-4 px-6 text-right">Định mức</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {displayItems.map((rule) => (
                                      <tr
                                        key={rule.id}
                                        className="hover:bg-slate-50 transition-colors"
                                      >
                                        <td className="py-5 px-8">
                                          <div>
                                            <div className="font-bold text-slate-800 leading-tight">
                                              {rule.title}
                                            </div>
                                            {rule.note && (
                                              <div className="text-xs text-slate-400 italic mt-0.5">
                                                {rule.note}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td
                                          className={`py-5 px-6 font-black whitespace-nowrap text-right ${type === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                                        >
                                          {rule.amount
                                            ? `${Number(rule.amount).toLocaleString('vi-VN')} đ`
                                            : 'Chưa có'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {allItems.length > 4 && (
                                  <div className="p-4 bg-slate-50/50 border-t flex justify-center">
                                    <button
                                      onClick={() => setFullView(!isFullView)}
                                      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isFullView ? 'bg-white text-slate-500 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                                    >
                                      {isFullView
                                        ? 'Thu gọn'
                                        : `Xem thêm ${allItems.length - 4} mục`}
                                    </button>
                                  </div>
                                )}
                                {allItems.length === 0 && (
                                  <div className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-widest text-xs">
                                    Trống dữ liệu bộ phận {selectedRuleCategory}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : adminSubTab === 'log' ? (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm Team hoặc Nhân sự..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>

                  <CustomSelect
                    className="min-w-[200px]"
                    value={logTeamFilter}
                    onValueChange={(val) => setLogTeamFilter(val)}
                    options={[
                      { label: 'Tất cả Team', value: 'all' },
                      ...Object.entries(groupedEmployees)
                        .filter(([tid]) => !!tid)
                        .sort((a, b) => a[1].name.localeCompare(b[1].name))
                        .map(([tid, group]) => ({ label: group.name, value: tid })),
                    ]}
                  />

                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:block ml-auto">
                    Chọn Team → Chọn thành viên
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(filteredTeamGroups).map(([tid, group]) => {
                    const isExpanded = expandedTeams.has(tid)

                    return (
                      <div
                        key={tid}
                        className="bg-white border rounded-3xl overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => {
                            const n = new Set(expandedTeams)
                            if (n.has(tid)) n.delete(tid)
                            else n.add(tid)
                            setExpandedTeams(n)
                          }}
                          className={`w-full px-8 py-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Users
                              className={`h-5 w-5 ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`}
                            />
                            <div className="text-left">
                              <h4 className="font-black text-slate-800 text-sm uppercase">
                                {group.name}
                              </h4>
                              <p className="text-xs text-slate-400 font-bold">
                                {group.members.length} thành viên
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-300" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-300" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-8 pb-6 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                              {group.members.map((emp) => (
                                <div
                                  key={emp.id}
                                  className="p-5 bg-white rounded-[2rem] border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 group/emp relative overflow-hidden"
                                >
                                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover/emp:opacity-100 transition-opacity" />
                                  <div className="mb-4">
                                    <div className="font-black text-slate-800 text-sm leading-tight mb-1">
                                      {emp.name || emp.fullNameLegal || 'Không rõ tên'}
                                    </div>
                                    <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                                      {emp.email}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleOpenAction(emp, 'REWARD')}
                                      className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-emerald-100"
                                    >
                                      Thưởng
                                    </button>
                                    <button
                                      onClick={() => handleOpenAction(emp, 'PENALTY')}
                                      className="flex-1 py-2.5 bg-rose-50 text-rose-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-100"
                                    >
                                      Phạt
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : adminSubTab === 'catalog' ? (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-3xl border shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-sm">
                        Cấu hình Quy chuẩn
                      </h3>
                      <p className="text-slate-400 text-xs font-bold">
                        Thêm/sửa nội dung định mức
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingRuleId(null)
                      setRuleForm({
                        teamId: '',
                        category: selectedRuleCategory,
                        type: 'PENALTY',
                        title: '',
                        amount: 0,
                        note: '',
                      })
                      setShowRuleModal(true)
                    }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 transition-all"
                  >
                    + Thêm quy định
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                  {excelTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedRuleCategory(tab)}
                      className={`px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${selectedRuleCategory === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-400 border-slate-50 hover:border-indigo-100 shadow-sm'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {['REWARD', 'PENALTY'].map((type) => {
                    const isTableExp = type === 'REWARD' ? rewardsExpanded : penaltiesExpanded
                    const setTableExp =
                      type === 'REWARD' ? setRewardsExpanded : setPenaltiesExpanded
                    const isFullView = type === 'REWARD' ? catalogRewardsFull : catalogPenaltiesFull
                    const setFullView =
                      type === 'REWARD' ? setCatalogRewardsFull : setCatalogPenaltiesFull
                    const allItems = activeCategoryRules.filter((r) => r.type === type)
                    const displayItems = isFullView ? allItems : allItems.slice(0, 4)

                    return (
                      <div
                        key={type}
                        className="bg-white border rounded-3xl shadow-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setTableExp(!isTableExp)}
                          className={`w-full px-8 py-5 border-b font-black text-xs uppercase flex items-center justify-between transition-colors ${isTableExp ? (type === 'REWARD' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100') : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            {type === 'REWARD' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            <span>Danh mục {type === 'REWARD' ? 'Khen thưởng' : 'Phạt lỗi'}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="opacity-40">{allItems.length} mục</span>
                            {isTableExp ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {isTableExp && (
                          <div className="overflow-x-auto animate-fade-in">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-xs font-black text-slate-400 uppercase border-b">
                                  <th className="py-4 px-8">Quy chuẩn</th>
                                  <th className="py-4 px-6">Định mức</th>
                                  <th className="py-4 px-8 text-center">Tác vụ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {displayItems.map((rule) => (
                                  <tr
                                    key={rule.id}
                                    className="hover:bg-slate-50 group transition-colors"
                                  >
                                    <td className="py-5 px-8">
                                      <div>
                                        <div className="font-bold text-slate-800 leading-tight">
                                          {rule.title}
                                        </div>
                                        {rule.note && (
                                          <div className="text-xs text-slate-400 italic mt-0.5">
                                            {rule.note}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className={`py-5 px-6 font-black whitespace-nowrap ${type === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                                    >
                                      {rule.amount
                                        ? `${Number(rule.amount).toLocaleString('vi-VN')} đ`
                                        : 'Chưa có'}
                                    </td>
                                    <td className="py-5 px-8">
                                      <div className="flex justify-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingRuleId(rule.id)
                                            setRuleForm({
                                              teamId: rule.teamId || '',
                                              category: getDisplayCategory(rule.category),
                                              type: rule.type,
                                              title: rule.title,
                                              amount: Number(rule.amount || 0),
                                              note: rule.note || '',
                                            })
                                            setShowRuleModal(true)
                                          }}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(rule.id)}
                                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {allItems.length > 4 && (
                              <div className="p-4 bg-slate-50/50 border-t flex justify-center">
                                <button
                                  onClick={() => setFullView(!isFullView)}
                                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isFullView ? 'bg-white text-slate-500 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                                >
                                  {isFullView
                                    ? 'Thu gọn danh sách'
                                    : `Xem thêm ${allItems.length - 4} mục còn lại`}
                                </button>
                              </div>
                            )}
                            {allItems.length === 0 && (
                              <div className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-widest text-xs">
                                Trống dữ liệu bộ phận {selectedRuleCategory}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhân sự hoặc nội dung..."
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value)
                        setHistoryPage(1)
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>

                  <CustomSelect
                    className="min-w-[200px]"
                    value={historyTeamFilter}
                    onValueChange={(val) => {
                      setHistoryTeamFilter(val)
                      setHistoryPage(1)
                    }}
                    options={[
                      { label: 'Tất cả Team', value: 'all' },
                      ...Array.from(
                        new Set(allRecords.map((r) => r.user.team?.name).filter(Boolean))
                      )
                        .sort()
                        .map((t) => ({ label: t as string, value: t as string })),
                    ]}
                  />

                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-auto">
                    <History className="h-4 w-4" />
                    Tổng: {allRecords.length}
                  </div>
                </div>

                <div className="bg-white border rounded-3xl shadow-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-white text-xs font-black uppercase">
                      <tr>
                        <th className="py-5 px-8">Nhân sự</th>
                        <th className="py-5 px-6">Loại</th>
                        <th className="py-5 px-6">Nội dung</th>
                        <th className="py-5 px-6">Số tiền</th>
                        <th className="py-5 px-8">Ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        const filtered = allRecords.filter((rec) => {
                          const s = historySearch.toLowerCase()
                          const matchesSearch =
                            rec.user.fullNameLegal.toLowerCase().includes(s) ||
                            rec.title.toLowerCase().includes(s)

                          const matchesTeam =
                            historyTeamFilter === 'all' || rec.user.team?.name === historyTeamFilter

                          return matchesSearch && matchesTeam
                        })
                        const totalPages = Math.ceil(filtered.length / itemsPerPage)
                        const start = (historyPage - 1) * itemsPerPage
                        const pageItems = filtered.slice(start, start + itemsPerPage)

                        return (
                          <>
                            {pageItems.map((rec) => (
                              <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-5 px-8 font-bold">
                                  {rec.user.fullNameLegal}
                                  <div className="text-xs text-indigo-500 font-black uppercase mt-0.5">
                                    {rec.user.team?.name}
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${rec.kind === 'REWARD' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-700'}`}
                                  >
                                    {rec.kind === 'REWARD' ? 'Thưởng' : 'Phạt'}
                                  </span>
                                </td>
                                <td className="py-5 px-6 font-medium text-slate-700">
                                  {rec.title}
                                  {rec.note && (
                                    <div className="text-xs text-slate-400 italic mt-0.5 font-medium">
                                      {rec.note}
                                    </div>
                                  )}
                                </td>
                                <td
                                  className={`py-5 px-6 font-black ${rec.kind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                                >
                                  {Number(rec.amount || 0).toLocaleString()} đ
                                </td>
                                <td className="py-5 px-8 text-slate-400 font-bold">
                                  {new Date(rec.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                              </tr>
                            ))}
                            {pageItems.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-widest text-xs"
                                >
                                  Không tìm thấy dữ liệu phù hợp
                                </td>
                              </tr>
                            )}
                            {/* Pagination Row */}
                            {totalPages > 1 && (
                              <tr>
                                <td colSpan={5} className="py-6 px-8 bg-slate-50/50">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                      Trang {historyPage} / {totalPages}
                                    </p>
                                    <div className="flex gap-1">
                                      <button
                                        disabled={historyPage === 1}
                                        onClick={() => setHistoryPage((p) => p - 1)}
                                        className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm"
                                      >
                                        <ChevronUp className="-rotate-90 h-4 w-4" />
                                      </button>
                                      {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                          key={i}
                                          onClick={() => setHistoryPage(i + 1)}
                                          className={`w-8 h-8 rounded-xl text-xs font-black transition-all shadow-sm ${historyPage === i + 1 ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                          {i + 1}
                                        </button>
                                      ))}
                                      <button
                                        disabled={historyPage === totalPages}
                                        onClick={() => setHistoryPage((p) => p + 1)}
                                        className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm"
                                      >
                                        <ChevronDown className="-rotate-90 h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showActionPanel && !!selectedEmp} onOpenChange={(open) => { if (!open) setShowActionPanel(false) }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-white/20 shadow-2xl [&>button]:hidden">
            <div className="bg-white rounded-[2.5rem] w-full shadow-2xl overflow-hidden border border-white/20">
              <div
                className={`px-10 py-8 text-white font-black uppercase text-sm tracking-[0.2em] flex justify-between items-center ${actionKind === 'REWARD' ? 'bg-emerald-600' : 'bg-rose-600'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    {actionKind === 'REWARD' ? (
                      <Award className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-0.5">Ghi nhận cho</div>
                    <div className="text-base">{selectedEmp.name || selectedEmp.fullNameLegal}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowActionPanel(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-10 space-y-8">
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-slate-50">
                  {excelTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedRuleCategory(tab)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase whitespace-nowrap border-2 transition-all ${selectedRuleCategory === tab ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {filteredActionRules.length > 0 ? (
                    filteredActionRules.map((rule) => (
                      <button
                        key={rule.id}
                        onClick={() => handleToggleRule(rule.id)}
                        className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center justify-between group relative overflow-hidden ${selectedRuleIds.has(rule.id) ? (actionKind === 'REWARD' ? 'border-emerald-500 bg-emerald-50/50' : 'border-rose-500 bg-rose-50/50') : 'border-slate-50 bg-slate-50 hover:border-slate-200'} ${appliedRuleIds.has(rule.id) ? 'opacity-70 pointer-events-none' : ''}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`font-black text-sm ${selectedRuleIds.has(rule.id) ? (actionKind === 'REWARD' ? 'text-emerald-900' : 'text-rose-900') : 'text-slate-700'}`}
                            >
                              {rule.title}
                            </div>
                            {appliedRuleIds.has(rule.id) && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-xs font-black uppercase rounded-full tracking-tighter">
                                Đã ghi nhận
                              </span>
                            )}
                          </div>
                          {rule.note && (
                            <div className="text-xs text-slate-400 italic font-medium">
                              {rule.note}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div
                            className={`font-black text-sm whitespace-nowrap px-4 py-1.5 rounded-full bg-white shadow-sm ${actionKind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                          >
                            {rule.amount ? `${Number(rule.amount).toLocaleString()} đ` : 'Chưa có'}
                          </div>
                          <div
                            className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all shadow-inner ${selectedRuleIds.has(rule.id) ? (actionKind === 'REWARD' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-rose-600 border-rose-600 text-white') : 'border-slate-200 bg-white'}`}
                          >
                            {selectedRuleIds.has(rule.id) && (
                              <Check className="h-5 w-5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-24 text-center text-slate-300 italic uppercase text-xs tracking-widest">
                      Không có dữ liệu trong mục {selectedRuleCategory}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Ghi chú chi tiết (Không bắt buộc)
                  </label>
                  <textarea
                    placeholder="Nhập thêm chi tiết về trường hợp này..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:border-indigo-500 outline-none transition-all"
                    rows={2}
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setShowActionPanel(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Đóng lại
                  </button>
                  <button
                    onClick={handleSubmitActions}
                    disabled={submitting || selectedRuleIds.size === 0}
                    className={`flex-[2] py-5 rounded-3xl font-black uppercase text-xs tracking-[0.25em] shadow-2xl transition-all ${submitting || selectedRuleIds.size === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : actionKind === 'REWARD' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'}`}
                  >
                    {submitting ? 'Đang xử lý...' : `Xác nhận (${selectedRuleIds.size})`}
                  </button>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleModal} onOpenChange={(open) => { if (!open) setShowRuleModal(false) }}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden border-slate-100 shadow-2xl [&>button]:hidden">
            <div className="bg-white rounded-3xl w-full shadow-2xl overflow-hidden border border-slate-100">
              <div className="bg-indigo-600 px-8 py-6 text-white font-black uppercase text-sm tracking-widest flex justify-between items-center">
                <span>{editingRuleId ? 'Cập nhật Quy chuẩn' : 'Thêm quy chuẩn mới'}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowRuleModal(false)} className="w-8 h-8 rounded-full hover:bg-white/20 text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleSaveRule} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Phân loại Excel"
                    value={ruleForm.category}
                    onValueChange={(val) => setRuleForm({ ...ruleForm, category: val })}
                    options={[
                      'CHUNG',
                      'TECH',
                      'ADS',
                      'EDITOR',
                      'HÀNH CHÍNH',
                      'KẾ TOÁN',
                      'KINH DOANH',
                      'LIVESTREAM',
                      'LOGISTIC',
                      'MEDIA',
                      'SẢN XUẤT',
                      'SALE CSKH',
                      'TMĐT',
                      'VẬN ĐƠN',
                      'CỬA HÀNG',
                    ]
                      .sort()
                      .map((cat) => ({
                        label: cat === 'TECH' ? 'CÔNG NGHỆ' : cat,
                        value: cat,
                      }))}
                  />
                  <CustomSelect
                    label="Loại"
                    value={ruleForm.type}
                    onValueChange={(val) => setRuleForm({ ...ruleForm, type: val as any })}
                    options={[
                      { label: 'Khen thưởng', value: 'REWARD' },
                      { label: 'Phạt lỗi', value: 'PENALTY' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Nội dung quy chuẩn
                  </label>
                  <input
                    required
                    type="text"
                    value={ruleForm.title}
                    onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Định mức (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ruleForm.amount ? Number(ruleForm.amount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '')
                      setRuleForm({ ...ruleForm, amount: rawValue ? Number(rawValue) : 0 })
                    }}
                    placeholder="VD: 100.000"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-black text-indigo-600 focus:border-indigo-600 outline-none"
                  />
                </div>
                <textarea
                  placeholder="Ghi chú điều kiện..."
                  value={ruleForm.note}
                  onChange={(e) => setRuleForm({ ...ruleForm, note: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:border-indigo-600 outline-none"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu quy chuẩn'}
                </button>
              </form>
            </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}
        title="Xác nhận xóa quy chuẩn?"
        description="Hành động này không thể hoàn tác. Quy chuẩn này sẽ bị xóa vĩnh viễn khỏi hệ thống."
        confirmLabel="Xác nhận xóa"
        destructive
        onConfirm={() => { if (deleteConfirmId) handleDeleteRule(deleteConfirmId) }}
      />
    </>
  )
}
