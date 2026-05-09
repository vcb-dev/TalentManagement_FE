import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { apiClient } from '@/lib/axios'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import {
  Award,
  AlertTriangle,
  TrendingUp,
  Trash2,
  Search,
  Edit,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Users,
  User,
  History,
  Check,
} from 'lucide-react'

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

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'my' | 'admin'>(isPrivileged ? 'admin' : 'my')
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

  // Action States
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [actionKind, setActionKind] = useState<'REWARD' | 'PENALTY'>('PENALTY')
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set())
  const [appliedRuleIds, setAppliedRuleIds] = useState<Set<string>>(new Set())
  const [customNote, setCustomNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

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
      const rulesRes = await apiClient.get<Rule[]>('/reward/rules')
      setRules(rulesRes.data || [])

      if (isPrivileged) {
        const [recordsRes, empRes] = await Promise.all([
          apiClient.get<RecordEntity[]>('/reward/records'),
          apiClient.get<any>('/employees?pageSize=500'),
        ])
        setAllRecords(recordsRes.data || [])
        const empData = empRes.data?.data || empRes.data?.items || empRes.data
        setEmployees(Array.isArray(empData) ? empData : [])
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

  // Auto-expand teams when searching
  useEffect(() => {
    if (teamSearch.trim()) {
      const matchingIds = Object.keys(filteredTeamGroups)
      setExpandedTeams((prev) => {
        const next = new Set(prev)
        matchingIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [teamSearch])

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, { name: string; members: any[] }> = {}
    if (!Array.isArray(employees)) return groups
    employees.forEach((emp: any) => {
      const tName = emp.teamNames && emp.teamNames.length > 0 ? emp.teamNames[0] : 'CHƯA GÁN TEAM'
      const tId = emp.teamIds && emp.teamIds.length > 0 ? emp.teamIds[0] : 'no-team'
      if (!groups[tId]) groups[tId] = { name: tName, members: [] }
      groups[tId].members.push(emp)
    })
    return groups
  }, [employees])

  const filteredTeamGroups = useMemo(() => {
    if (!teamSearch) return groupedEmployees
    const filtered: Record<string, { name: string; members: Employee[] }> = {}
    const searchLow = teamSearch.toLowerCase()
    Object.entries(groupedEmployees).forEach(([tid, group]) => {
      const matchesTeam = group.name.toLowerCase().includes(searchLow)
      const matchingMembers = group.members.filter((m) =>
        (m.name || '').toLowerCase().includes(searchLow)
      )
      if (matchesTeam || matchingMembers.length > 0) {
        filtered[tid] = {
          name: group.name,
          members: matchesTeam ? group.members : matchingMembers,
        }
      }
    })
    return filtered
  }, [groupedEmployees, teamSearch])

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
    if (!confirm('Bạn có chắc chắn muốn xóa quy định này?')) return
    try {
      await apiClient.delete(`/reward/rules/${id}`)
      await fetchData(true)
      toast.success('Đã xóa quy định thành công')
    } catch (error) {
      console.error('Failed to delete rule:', error)
      toast.error('Không thể xóa quy định này')
    }
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...ruleForm,
        teamId: ruleForm.teamId || null,
        amount: Number(ruleForm.amount),
      }
      if (editingRuleId) await apiClient.patch(`/reward/rules/${editingRuleId}`, payload)
      else await apiClient.post('/reward/rules', payload)
      setShowRuleModal(false)
      await fetchData(true)
      toast.success(editingRuleId ? 'Đã cập nhật quy chuẩn' : 'Đã thêm quy chuẩn mới')
    } catch (error) {
      console.error('Failed to save rule:', error)
      toast.error('Lỗi khi lưu quy chuẩn')
    } finally {
      setSubmitting(false)
    }
  }

  const myTotalRewards = myRecords
    .filter((r) => r.kind === 'REWARD')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const myTotalPenalties = myRecords
    .filter((r) => r.kind === 'PENALTY')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const myNetBalance = myTotalRewards - myTotalPenalties

  const excelTabs = Array.from(
    new Set(
      rules
        .filter((r) => !HIDDEN_CATEGORIES.includes(r.category.toUpperCase().replace(/_/g, ' ')))
        .map((r) => getDisplayCategory(r.category))
    )
  ).sort((a, b) => (a === 'CHUNG' ? -1 : b === 'CHUNG' ? 1 : a.localeCompare(b)))

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
          {isPrivileged && (
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Quản trị
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cá nhân
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-slate-500 text-sm italic">Đang tải dữ liệu...</p>
          </div>
        ) : activeTab === 'my' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-600 p-6 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-emerald-100">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase">Thưởng tích lũy</p>
                  <p className="text-3xl font-black">{myTotalRewards.toLocaleString()} đ</p>
                </div>
                <TrendingUp className="h-10 w-10 opacity-20" />
              </div>
              <div className="bg-rose-600 p-6 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-rose-100">
                <div>
                  <p className="text-rose-100 text-xs font-bold uppercase">Phạt khấu trừ</p>
                  <p className="text-3xl font-black">{myTotalPenalties.toLocaleString()} đ</p>
                </div>
                <AlertTriangle className="h-10 w-10 opacity-20" />
              </div>
              <div className="bg-indigo-600 p-6 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-indigo-100">
                <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase">Số dư thực tính</p>
                  <p className="text-3xl font-black">{myNetBalance.toLocaleString()} đ</p>
                </div>
                <Award className="h-10 w-10 opacity-20" />
              </div>
            </div>
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setMySubTab('history')}
                className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${mySubTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
              >
                Lịch sử của tôi
              </button>
              <button
                onClick={() => setMySubTab('catalog')}
                className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${mySubTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
              >
                Tra cứu Quy chuẩn
              </button>
            </div>
            {mySubTab === 'history' ? (
              <div className="space-y-4">
                {myRecords.length > 0 ? (
                  myRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-2xl flex-shrink-0 ${rec.kind === 'REWARD' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                        >
                          {rec.kind === 'REWARD' ? (
                            <Award className="h-6 w-6" />
                          ) : (
                            <AlertTriangle className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${rec.kind === 'REWARD' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                            >
                              {rec.kind === 'REWARD' ? 'Khen thưởng' : 'Vi phạm'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(rec.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-800 text-base mb-1">{rec.title}</h4>
                          {rec.note && (
                            <p className="text-sm text-slate-500 italic mb-2">"{rec.note}"</p>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                            <User className="h-3 w-3" />
                            Ghi nhận bởi:{' '}
                            <span className="text-indigo-500">
                              {rec.createdBy?.fullNameLegal || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                        <div className="md:hidden text-[10px] font-black text-slate-400 uppercase">
                          Giá trị
                        </div>
                        <div
                          className={`text-xl font-black ${rec.kind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {rec.kind === 'REWARD' ? '+' : '-'}
                          {Number(rec.amount || 0).toLocaleString()} đ
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] py-24 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                      Chưa có lịch sử ghi nhận
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {excelTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedRuleCategory(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap border-2 ${selectedRuleCategory === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {['REWARD', 'PENALTY'].map((type) => (
                    <div
                      key={type}
                      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
                    >
                      <div
                        className={`px-6 py-4 border-b font-black text-xs uppercase tracking-widest ${type === 'REWARD' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}
                      >
                        {type === 'REWARD' ? 'Khen thưởng' : 'Phạt lỗi'} [{selectedRuleCategory}]
                      </div>
                      <div className="divide-y divide-slate-50">
                        {activeCategoryRules
                          .filter((r) => r.type === type)
                          .map((rule) => (
                            <div
                              key={rule.id}
                              className="p-5 flex justify-between items-center hover:bg-slate-50"
                            >
                              <div>
                                <div className="font-bold text-slate-700 text-sm">{rule.title}</div>
                                {rule.note && (
                                  <div className="text-[11px] text-slate-400 italic">
                                    {rule.note}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`font-black ${type === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                              >
                                {Number(rule.amount || 0).toLocaleString()} đ
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200">
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
            </div>

            {adminSubTab === 'log' ? (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl flex items-center justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm Team hoặc Nhân sự..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
                    Chọn Team → Chọn thành viên → Chọn lỗi để áp phạt nhanh
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
                              <p className="text-[10px] text-slate-400 font-bold">
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
                                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                                      {emp.email}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleOpenAction(emp, 'REWARD')}
                                      className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-emerald-100"
                                    >
                                      Thưởng
                                    </button>
                                    <button
                                      onClick={() => handleOpenAction(emp, 'PENALTY')}
                                      className="flex-1 py-2.5 bg-rose-50 text-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-100"
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
                      <p className="text-slate-400 text-[10px] font-bold">
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
                      className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all whitespace-nowrap border-2 ${selectedRuleCategory === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-400 border-slate-50 hover:border-indigo-100 shadow-sm'}`}
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
                            <table className="w-full text-left text-[13px]">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
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
                                          <div className="text-[11px] text-slate-400 italic mt-0.5">
                                            {rule.note}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className={`py-5 px-6 font-black whitespace-nowrap ${type === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                                    >
                                      {Number(rule.amount || 0).toLocaleString('vi-VN')} đ
                                    </td>
                                    <td className="py-5 px-8">
                                      <div className="flex justify-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingRuleId(rule.id)
                                            setRuleForm({
                                              teamId: rule.teamId || '',
                                              category: rule.category,
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
                                          onClick={() => handleDeleteRule(rule.id)}
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
                                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isFullView ? 'bg-white text-slate-500 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                                >
                                  {isFullView
                                    ? 'Thu gọn danh sách'
                                    : `Xem thêm ${allItems.length - 4} mục còn lại`}
                                </button>
                              </div>
                            )}
                            {allItems.length === 0 && (
                              <div className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-widest text-[10px]">
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
              <div className="bg-white border rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                    <tr>
                      <th className="py-4 px-8">Nhân sự</th>
                      <th className="py-4 px-6">Loại</th>
                      <th className="py-4 px-6">Nội dung</th>
                      <th className="py-4 px-6">Số tiền</th>
                      <th className="py-4 px-8">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td className="py-4 px-8 font-bold">
                          {rec.user.fullNameLegal}
                          <div className="text-[10px] text-indigo-500">{rec.user.team?.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${rec.kind === 'REWARD' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-700'}`}
                          >
                            {rec.kind === 'REWARD' ? 'Thưởng' : 'Phạt'}
                          </span>
                        </td>
                        <td className="py-4 px-6">{rec.title}</td>
                        <td
                          className={`py-4 px-6 font-black ${rec.kind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {Number(rec.amount || 0).toLocaleString()} đ
                        </td>
                        <td className="py-4 px-8 text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showActionPanel &&
        selectedEmp &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setShowActionPanel(false)}
            />
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 animate-scale-in relative z-10 my-auto">
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
                    <div className="text-[10px] opacity-70 mb-0.5">Ghi nhận cho</div>
                    <div className="text-base">{selectedEmp.name || selectedEmp.fullNameLegal}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowActionPanel(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-slate-50">
                  {excelTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedRuleCategory(tab)}
                      className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase whitespace-nowrap border-2 transition-all ${selectedRuleCategory === tab ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
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
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black uppercase rounded-full tracking-tighter">
                                Đã ghi nhận
                              </span>
                            )}
                          </div>
                          {rule.note && (
                            <div className="text-[11px] text-slate-400 italic font-medium">
                              {rule.note}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div
                            className={`font-black text-sm whitespace-nowrap px-4 py-1.5 rounded-full bg-white shadow-sm ${actionKind === 'REWARD' ? 'text-emerald-600' : 'text-rose-600'}`}
                          >
                            {Number(rule.amount || 0).toLocaleString()} đ
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
                    <div className="py-24 text-center text-slate-300 italic uppercase text-[10px] tracking-widest">
                      Không có dữ liệu trong mục {selectedRuleCategory}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Đóng lại
                  </button>
                  <button
                    onClick={handleSubmitActions}
                    disabled={submitting || selectedRuleIds.size === 0}
                    className={`flex-[2] py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.25em] shadow-2xl transition-all ${submitting || selectedRuleIds.size === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : actionKind === 'REWARD' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'}`}
                  >
                    {submitting ? 'Đang xử lý...' : `Xác nhận (${selectedRuleIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showRuleModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowRuleModal(false)}
            />
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-scale-in relative z-10 my-auto">
              <div className="bg-indigo-600 px-8 py-6 text-white font-black uppercase text-sm tracking-widest flex justify-between items-center">
                <span>{editingRuleId ? 'Cập nhật Quy chuẩn' : 'Thêm quy chuẩn mới'}</span>
                <button onClick={() => setShowRuleModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveRule} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Phân loại Excel
                    </label>
                    <input
                      required
                      type="text"
                      value={ruleForm.category}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, category: e.target.value.toUpperCase() })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Loại
                    </label>
                    <select
                      value={ruleForm.type}
                      onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none"
                    >
                      <option value="REWARD">Khen thưởng</option>
                      <option value="PENALTY">Phạt lỗi</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Định mức (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.amount}
                    onChange={(e) => setRuleForm({ ...ruleForm, amount: Number(e.target.value) })}
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
          </div>,
          document.body
        )}
    </>
  )
}
