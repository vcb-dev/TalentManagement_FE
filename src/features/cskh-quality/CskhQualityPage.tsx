import { Link, getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  RefreshCw,
  Link2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldCheck,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Search,
  ChevronDown,
  Target,
  DollarSign,
  MessageCircle,
  Megaphone,
  Download,
  Award,
  TrendingDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { fetchCskhPages, getCskhOAuthStartUrl, refreshCskhOAuth, fetchRunningCskhJob } from './api'
import { AuditMessengerView } from './AuditMessengerView'
import { CskhGlassPanel, CskhPageShell, CskhPageAvatar } from './cskhUi'

const cskhQualityRoute = getRouteApi('/_protected/cskh-quality')

// Custom Facebook Icon because newer versions of lucide-react do not export brand icons.
function Facebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

const AUDIT_JOB_KEY = 'cskh:audit-job-id'

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('vi-VN')
}

// ==========================================
// MOCK DATA FOR CSKH QUALITY OVERVIEW
// ==========================================

const MOCK_KPI_CARDS = [
  {
    id: 'qa-score',
    label: 'QA Score (Chất lượng TB)',
    value: '85',
    max: '/100',
    trend: '↑ 6.2 điểm',
    comparison: 'so với 01/04 - 30/04',
    isPositive: true,
    strokeColor: '#10b981', // green
    data: [{ v: 75 }, { v: 78 }, { v: 76 }, { v: 81 }, { v: 80 }, { v: 83 }, { v: 85 }],
  },
  {
    id: 'csat',
    label: 'CSAT (Hài lòng)',
    value: '92%',
    max: '',
    trend: '↑ 5%',
    comparison: 'vs 87%',
    isPositive: true,
    strokeColor: '#10b981', // green
    data: [{ v: 87 }, { v: 88 }, { v: 89 }, { v: 91 }, { v: 90 }, { v: 92 }, { v: 92 }],
  },
  {
    id: 'conversion-rate',
    label: 'Tỷ lệ chốt đơn',
    value: '28.6%',
    max: '',
    trend: '↑ 4.1%',
    comparison: 'vs 24.5%',
    isPositive: true,
    strokeColor: '#8b5cf6', // purple
    data: [
      { v: 24.5 },
      { v: 25.1 },
      { v: 26.2 },
      { v: 25.8 },
      { v: 27.0 },
      { v: 28.1 },
      { v: 28.6 },
    ],
  },
  {
    id: 'revenue',
    label: 'Doanh thu ước tính',
    value: '1.286.450.000đ',
    max: '',
    trend: '↑ 23.4%',
    comparison: 'vs 1.042.350.000đ',
    isPositive: true,
    strokeColor: '#10b981', // green
    data: [
      { v: 1042 },
      { v: 1100 },
      { v: 1080 },
      { v: 1150 },
      { v: 1210 },
      { v: 1250 },
      { v: 1286 },
    ],
  },
  {
    id: 'organic-orders',
    label: 'Đơn từ tin nhắn tự nhiên',
    value: '972 đơn',
    max: ' (64.7%)',
    trend: '↑ 17.6%',
    comparison: 'vs 827 đơn',
    isPositive: true,
    strokeColor: '#3b82f6', // blue
    data: [{ v: 827 }, { v: 840 }, { v: 865 }, { v: 890 }, { v: 910 }, { v: 950 }, { v: 972 }],
  },
  {
    id: 'ad-orders',
    label: 'Đơn từ quảng cáo',
    value: '530 đơn',
    max: ' (35.3%)',
    trend: '↑ 16.2%',
    comparison: 'vs 456 đơn',
    isPositive: true,
    strokeColor: '#8b5cf6', // purple
    data: [{ v: 456 }, { v: 470 }, { v: 480 }, { v: 505 }, { v: 498 }, { v: 515 }, { v: 530 }],
  },
]

const MOCK_QUALITY_TREND = [
  { name: '01/05', qaScore: 40, csat: 62, conversion: 20 },
  { name: '06/05', qaScore: 50, csat: 70, conversion: 25 },
  { name: '11/05', qaScore: 60, csat: 80, conversion: 35 },
  { name: '16/05', qaScore: 55, csat: 75, conversion: 30 },
  { name: '21/05', qaScore: 48, csat: 78, conversion: 28 },
  { name: '26/05', qaScore: 55, csat: 80, conversion: 30 },
  { name: '31/05', qaScore: 65, csat: 85, conversion: 40 },
]

const MOCK_SOURCE_PIE = [
  { name: 'Tin nhắn tự nhiên', value: 3402, color: '#3b82f6', chotDon: 972, rate: '28.6%' },
  { name: 'Quảng cáo', value: 1851, color: '#10b981', chotDon: 530, rate: '28.6%' },
]

const MOCK_TOP_PRODUCTS = [
  { id: 1, name: 'Nhẫn bạc Kim Hoàn Trơn Classic', count: 1125, percent: 21.4, color: '#8b5cf6' },
  { id: 2, name: 'Dây chuyền bạc nữ', count: 856, percent: 16.3, color: '#f59e0b' },
  { id: 3, name: 'Lắc tay bạc', count: 741, percent: 14.1, color: '#3b82f6' },
  { id: 4, name: 'Bông tai bạc', count: 623, percent: 11.9, color: '#06b6d4' },
  { id: 5, name: 'Nhẫn bạc đính đá', count: 512, percent: 9.8, color: '#ec4899' },
]

const MOCK_PAGE_EFFECTIVENESS = [
  { name: 'Viễn Chí Bảo - Trang chính', conversations: 1825, qaScore: 87, conversionRate: '31.7%' },
  { name: 'Viễn Chí Bảo - HN', conversations: 1213, qaScore: 83, conversionRate: '27.8%' },
  { name: 'Viễn Chí Bảo - HCM', conversations: 898, qaScore: 81, conversionRate: '26.1%' },
  { name: 'Viễn Chí Bảo - Đà Nẵng', conversations: 567, qaScore: 78, conversionRate: '24.5%' },
  { name: 'Viễn Chí Bảo - Shop 2', conversations: 375, qaScore: 76, conversionRate: '22.9%' },
]

const MOCK_FUNNEL_STEPS = [
  { name: 'Tổng hội thoại', count: 5253, percent: '100%', bg: 'from-blue-700 to-blue-800' },
  { name: 'Đã tư vấn', count: 3982, percent: '75.8%', bg: 'from-blue-500 to-blue-600' },
  { name: 'Khách quan tâm', count: 2146, percent: '40.9%', bg: 'from-violet-500 to-violet-600' },
  { name: 'Báo giá', count: 1762, percent: '33.6%', bg: 'from-pink-500 to-pink-600' },
  { name: 'Chốt đơn', count: 1502, percent: '28.6%', bg: 'from-emerald-500 to-emerald-600' },
]

const MOCK_FUNNEL_CONVERSIONS = [
  { value: '75.8%' },
  { value: '53.9%' },
  { value: '82.1%' },
  { value: '85.2%' },
]

const MOCK_CUSTOMERS_TO_CARE = [
  {
    id: 're-care',
    label: 'Cần chăm sóc lại',
    count: 267,
    border: 'border-blue-100',
    bg: 'bg-blue-50/50',
    text: 'text-blue-700',
    type: 're-care',
  },
  {
    id: 'warranty',
    label: 'Cần bảo hành / đổi trả',
    count: 83,
    border: 'border-emerald-100',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-700',
    type: 'warranty',
  },
  {
    id: 'unclosed',
    label: 'Khách chưa chốt đơn (quá 24h)',
    count: 145,
    border: 'border-amber-100',
    bg: 'bg-amber-50/50',
    text: 'text-amber-700',
    type: 'unclosed',
  },
  {
    id: 'negative-sentiment',
    label: 'Khách có cảm xúc tiêu cực',
    count: 37,
    border: 'border-rose-100',
    bg: 'bg-rose-50/50',
    text: 'text-rose-700',
    type: 'negative',
  },
]

const MOCK_STAFF_RANKING = [
  {
    rank: 1,
    name: 'Trung Hiếu',
    hasTrophy: true,
    qaScore: 92,
    conversionRate: '34.6%',
    conversations: 632,
    avatar: 'TH',
  },
  {
    rank: 2,
    name: 'Hoangvan Hoangvan',
    hasTrophy: false,
    qaScore: 88,
    conversionRate: '29.7%',
    conversations: 598,
    avatar: 'HH',
  },
  {
    rank: 3,
    name: 'Oanh Lê',
    hasTrophy: false,
    qaScore: 86,
    conversionRate: '28.1%',
    conversations: 512,
    avatar: 'OL',
  },
  {
    rank: 4,
    name: 'Jarvis Nguyen',
    hasTrophy: false,
    qaScore: 84,
    conversionRate: '27.4%',
    conversations: 478,
    avatar: 'JN',
  },
  {
    rank: 5,
    name: 'Goc Pho Mua Thu',
    hasTrophy: false,
    qaScore: 82,
    conversionRate: '25.9%',
    conversations: 430,
    avatar: 'GP',
  },
]

const MOCK_KEYWORDS = [
  { text: 'nhẫn', count: 824 },
  { text: 'size', count: 689 },
  { text: 'dây chuyền', count: 589 },
  { text: 'giá', count: 521 },
  { text: 'bạc', count: 925 },
  { text: 'bảo hành', count: 398 },
  { text: 'bông tai', count: 321 },
  { text: 'đặt trả', count: 336 },
  { text: 'đổi trả', count: 301 },
  { text: 'khuyến mãi', count: 290 },
]

const MOCK_SENTIMENT_TRENDS = [
  { name: '01/05', positive: 75, neutral: 15, negative: 10 },
  { name: '06/05', positive: 78, neutral: 16, negative: 6 },
  { name: '11/05', positive: 76, neutral: 18, negative: 6 },
  { name: '16/05', positive: 74, neutral: 17, negative: 9 },
  { name: '21/05', positive: 78, neutral: 16, negative: 6 },
  { name: '26/05', positive: 80, neutral: 15, negative: 5 },
  { name: '31/05', positive: 82, neutral: 14, negative: 4 },
]

const MOCK_RECENT_ACTIVITIES = [
  { time: '10:29', label: 'Audit hoàn thành: Hội thoại #5204 - 85 điểm', type: 'audit' },
  { time: '10:15', label: 'Khách hàng cần chăm sóc lại (quá 24h): 5 khách', type: 'unclosed' },
  { time: '09:58', label: 'Đã chốt đơn mới: #DH73921 - 1.950.000đ', type: 'closed-order' },
  { time: '09:40', label: '3 hội thoại có cảm xúc tiêu cực', type: 'negative' },
  { time: '09:22', label: 'Khách yêu cầu bảo hành: #BH3201', type: 'warranty' },
]

// ==========================================
// MOCK DATA FOR FB PAGE TAB
// ==========================================

const MOCK_FB_KPI_CARDS = [
  {
    id: 'total-messages',
    label: 'Tổng tin nhắn',
    value: '8.625',
    trend: '↑ 18.6%',
    comparison: 'so với tháng trước',
  },
  {
    id: 'ad-messages',
    label: 'Tin nhắn từ quảng cáo',
    value: '5.248',
    trend: '↑ 24.3%',
    comparison: '60.8% tổng tin nhắn',
  },
  {
    id: 'response-rate',
    label: 'Tỷ lệ phản hồi',
    value: '85.3%',
    trend: '↑ 3.8%',
    comparison: 'so với tháng trước',
  },
  {
    id: 'closing-rate',
    label: 'Tỷ lệ chốt',
    value: '28.6%',
    trend: '↑ 4.2%',
    comparison: 'so với tháng trước',
  },
  {
    id: 'revenue-chat',
    label: 'Doanh thu từ chat',
    value: '1.248.500.000đ',
    trend: '↑ 22.5%',
    comparison: 'so với tháng trước',
  },
]

const MOCK_FB_PAGES_LIST = [
  {
    name: 'Vienchibao Jewelry',
    handle: '@vienchibao.jewelry',
    status: 'active',
    totalMsg: 2352,
    totalTrend: '↑ 20.1%',
    adMsg: 1548,
    adTrend: '↑ 28.3%',
    adPercent: '65.8%',
    responseRate: '89.2%',
    responseTrend: '↑ 2.9%',
    closingRate: '32.1%',
    closingTrend: '↑ 3.5%',
    revenue: '420.500.000đ',
    revenueTrend: '↑ 18.4%',
    quality: 92,
    trendData: [110, 115, 112, 120, 125, 128, 132],
    isPositiveTrend: true,
  },
  {
    name: 'Vienchibao Official',
    handle: '@vienchibao.official',
    status: 'active',
    totalMsg: 1856,
    totalTrend: '↑ 15.7%',
    adMsg: 1120,
    adTrend: '↑ 21.6%',
    adPercent: '60.4%',
    responseRate: '86.7%',
    responseTrend: '↑ 2.1%',
    closingRate: '29.8%',
    closingTrend: '↑ 3.2%',
    revenue: '312.200.000đ',
    revenueTrend: '↑ 16.2%',
    quality: 88,
    trendData: [90, 95, 93, 100, 102, 106, 110],
    isPositiveTrend: true,
  },
  {
    name: 'Vienchibao Thailand',
    handle: '@vienchibao.th',
    status: 'active',
    totalMsg: 1248,
    totalTrend: '↑ 12.3%',
    adMsg: 892,
    adTrend: '↑ 18.9%',
    adPercent: '71.6%',
    responseRate: '84.1%',
    responseTrend: '↑ 1.8%',
    closingRate: '26.7%',
    closingTrend: '↑ 2.8%',
    revenue: '210.800.000đ',
    revenueTrend: '↑ 12.7%',
    quality: 85,
    trendData: [70, 75, 72, 78, 80, 84, 85],
    isPositiveTrend: true,
  },
  {
    name: 'VB Accessories',
    handle: '@vb.accessories',
    status: 'active',
    totalMsg: 964,
    totalTrend: '↑ 9.8%',
    adMsg: 564,
    adTrend: '↑ 16.4%',
    adPercent: '58.5%',
    responseRate: '82.3%',
    responseTrend: '↑ 1.6%',
    closingRate: '24.9%',
    closingTrend: '↑ 2.1%',
    revenue: '128.600.000đ',
    revenueTrend: '↑ 10.3%',
    quality: 82,
    trendData: [60, 63, 61, 66, 68, 72, 75],
    isPositiveTrend: true,
  },
  {
    name: 'Vienchibao Men',
    handle: '@vienchibao.men',
    status: 'active',
    totalMsg: 632,
    totalTrend: '↑ 14.1%',
    adMsg: 356,
    adTrend: '↑ 11.3%',
    adPercent: '56.3%',
    responseRate: '78.5%',
    responseTrend: '↑ 1.2%',
    closingRate: '22.3%',
    closingTrend: '↑ 1.9%',
    revenue: '86.300.000đ',
    revenueTrend: '↑ 8.7%',
    quality: 79,
    trendData: [45, 48, 46, 52, 55, 58, 62],
    isPositiveTrend: true,
  },
  {
    name: 'Vienchibao Customer Care',
    handle: '@vb.customer.care',
    status: 'active',
    totalMsg: 356,
    totalTrend: '↑ 8.7%',
    adMsg: 216,
    adTrend: '↑ 11.3%',
    adPercent: '60.7%',
    responseRate: '76.1%',
    responseTrend: '↑ 1.0%',
    closingRate: '19.8%',
    closingTrend: '↑ 1.5%',
    revenue: '54.700.000đ',
    revenueTrend: '↑ 7.8%',
    quality: 75,
    trendData: [30, 32, 31, 35, 38, 40, 42],
    isPositiveTrend: true,
  },
  {
    name: 'VB Diamond',
    handle: '@vb.diamond',
    status: 'inactive',
    totalMsg: 128,
    totalTrend: '↓ 5.2%',
    adMsg: 64,
    adTrend: '↓ 8.6%',
    adPercent: '50.0%',
    responseRate: '65.3%',
    responseTrend: '↓ 0.7%',
    closingRate: '14.2%',
    closingTrend: '↓ 1.1%',
    revenue: '22.100.000đ',
    revenueTrend: '↓ 4.3%',
    quality: 62,
    trendData: [25, 23, 20, 18, 15, 14, 12],
    isPositiveTrend: false,
  },
]

const MOCK_FB_MESSAGE_TREND = [
  { name: '01/05', total: 300, ad: 150 },
  { name: '06/05', total: 450, ad: 250 },
  { name: '11/05', total: 400, ad: 220 },
  { name: '16/05', total: 550, ad: 320 },
  { name: '21/05', total: 520, ad: 300 },
  { name: '26/05', total: 600, ad: 380 },
  { name: '31/05', total: 650, ad: 420 },
]

const MOCK_FB_SOURCE_PIE = [
  { name: 'Từ quảng cáo', value: 5248, color: '#10b981' },
  { name: 'Từ nguồn khác', value: 3377, color: '#94a3b8' },
]

const MOCK_FB_AD_METRICS = [
  {
    id: 'ad-total',
    label: 'Tổng tin nhắn từ quảng cáo',
    value: '5.248',
    trend: '↑ 24.3%',
    isPositive: true,
  },
  {
    id: 'ad-cost',
    label: 'Chi phí quảng cáo',
    value: '24.500.000đ',
    trend: '↑ 12.5%',
    isPositive: true,
  },
  {
    id: 'ad-cpm',
    label: 'Chi phí / tin nhắn',
    value: '4.671đ',
    trend: '↓ 9.3%',
    isPositive: false,
  },
  {
    id: 'ad-quality',
    label: 'Chất lượng tin nhắn (AI)',
    value: '86/100',
    trend: '↑ 5.2%',
    isPositive: true,
  },
]

const MOCK_FB_TOP_ADS = [
  {
    id: 1,
    name: 'Quảng cáo nhẫn bạc Classic',
    page: 'Vienchibao Jewelry',
    messages: 1245,
    cost: '3.980đ',
    image: '💍',
  },
  {
    id: 2,
    name: 'Dây chuyền bạc Minimal',
    page: 'Vienchibao Official',
    messages: 986,
    cost: '4.120đ',
    image: '📿',
  },
  {
    id: 3,
    name: 'Khuyến mãi 20% - Tháng 5',
    page: 'Vienchibao Thailand',
    messages: 754,
    cost: '4.530đ',
    image: '🏷️',
  },
  {
    id: 4,
    name: 'Bộ trang sức quà tặng',
    page: 'VB Accessories',
    messages: 564,
    cost: '4.890đ',
    image: '🎁',
  },
  {
    id: 5,
    name: 'Nhẫn bạc nam cá tính',
    page: 'Vienchibao Men',
    messages: 356,
    cost: '5.210đ',
    image: '💍',
  },
]

const MOCK_FB_AI_INSIGHTS = [
  {
    id: 1,
    type: 'success',
    text: 'Vienchibao Jewelry có chất lượng tin nhắn từ quảng cáo tốt nhất (92/100).',
  },
  {
    id: 2,
    type: 'info',
    text: 'Vienchibao Thailand có tỷ lệ tin nhắn từ quảng cáo cao nhất (71.6%).',
  },
  { id: 3, type: 'warning', text: 'VB Diamond đang có xu hướng giảm, cần tối ưu lại quảng cáo.' },
  {
    id: 4,
    type: 'tip',
    text: 'Nên tăng ngân sách cho quảng cáo "Nhẫn bạc Classic" để tăng tin nhắn.',
  },
]

function Sparkline({ data, strokeColor }: { data: { v: number }[]; strokeColor: string }) {
  return <SparklinePath data={data.map((d) => d.v)} stroke={strokeColor} />
}

function getCardIconAndColors(id: string) {
  switch (id) {
    case 'qa-score':
      return {
        icon: <ShieldCheck className="h-4.5 w-4.5" />,
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-100/50',
      }
    case 'csat':
      return {
        icon: <Smile className="h-4.5 w-4.5" />,
        iconBg: 'bg-amber-50 text-amber-500 border border-amber-100/50',
      }
    case 'conversion-rate':
      return {
        icon: <Target className="h-4.5 w-4.5" />,
        iconBg: 'bg-purple-50 text-purple-600 border border-purple-100/50',
      }
    case 'revenue':
      return {
        icon: <DollarSign className="h-4.5 w-4.5" />,
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50',
      }
    case 'organic-orders':
      return {
        icon: <MessageCircle className="h-4.5 w-4.5" />,
        iconBg: 'bg-blue-50 text-blue-500 border border-blue-100/50',
      }
    case 'ad-orders':
      return {
        icon: <Megaphone className="h-4.5 w-4.5" />,
        iconBg: 'bg-purple-50 text-purple-500 border border-purple-100/50',
      }
    default:
      return {
        icon: <TrendingUp className="h-4.5 w-4.5" />,
        iconBg: 'bg-slate-50 text-slate-500 border border-slate-100/50',
      }
  }
}

function OverviewTab() {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-x-hidden bg-[#f4f7fc] p-2 pb-4 sm:gap-2.5 sm:p-3 sm:pb-5 font-sans">
      {/* Upper Title and Operational Overview Banner */}
      <div className="shrink-0 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
              CSKH Quality
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Tổng quan vận hành CSKH
            </h2>
            <p className="mt-0.5 hidden max-w-3xl text-xs text-slate-600 xl:block">
              Theo dõi kết nối Facebook, inbox real-time và chất lượng audit AI trên cùng một màn.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Link
              to="/cskh-quality"
              search={{ tab: 'audit' }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Mở Audit <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/cskh-quality"
              search={{ tab: 'config' }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Cấu hình Page
            </Link>
          </div>
        </div>
      </div>

      {/* Reihe 1: 6 KPI-Karten mit Sparklines */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        {MOCK_KPI_CARDS.map((card) => {
          const details = getCardIconAndColors(card.id)
          const isCompactValue =
            card.id === 'revenue' || card.id === 'organic-orders' || card.id === 'ad-orders'
          return (
            <div
              key={card.id}
              className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200/60 bg-white p-2.5 shadow-sm transition duration-200 hover:shadow-md"
            >
              {/* Row 1: Icon and Title */}
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    details.iconBg
                  )}
                >
                  {details.icon}
                </div>
                <span className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 line-clamp-2 leading-snug">
                  {card.label}
                </span>
              </div>

              {/* Row 2: Main Big Value */}
              <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-1">
                <span
                  className={cn(
                    'min-w-0 font-black tracking-tight text-slate-800 break-words',
                    isCompactValue ? 'text-base sm:text-lg' : 'text-xl'
                  )}
                >
                  {card.value}
                </span>
                {card.max && (
                  <span className="shrink-0 text-sm font-bold text-slate-400">{card.max}</span>
                )}
                {(card.id === 'csat' || card.id === 'conversion-rate') && (
                  <span className="ml-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-600">
                    {card.trend}
                  </span>
                )}
              </div>

              {/* Row 3: Bottom info + Sparkline separated */}
              <div className="mt-1 flex items-end justify-between gap-1.5">
                {/* Left Column: Trend and comparison details */}
                <div className="flex flex-col min-w-0 pr-1 select-none">
                  {card.id !== 'csat' && card.id !== 'conversion-rate' ? (
                    <>
                      <div className="mb-0.5">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-600">
                          {card.trend}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold truncate">
                        {card.comparison}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      {card.comparison}
                    </span>
                  )}
                </div>

                {/* Right Column: Clean Sparkline with Dots */}
                <Sparkline data={card.data} strokeColor={card.strokeColor} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Reihe 2: Analyse & Produkte */}
      <div className="grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-12">
        {/* Xu hướng chất lượng theo ngày */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm xl:col-span-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 sm:text-sm">
              Xu hướng chất lượng theo ngày
            </h3>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-[11px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition">
              <span>Theo ngày</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Legend Custom */}
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>QA Score (TB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>CSAT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Tỷ lệ chốt đơn</span>
            </div>
          </div>

          {/* Recharts Area/Line Chart */}
          <div className="h-[130px] w-full sm:h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={MOCK_QUALITY_TREND}
                margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="qaScore"
                  name="QA Score (TB)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="csat"
                  name="CSAT"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="conversion"
                  name="Tỷ lệ chốt đơn"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nguồn hội thoại & tỷ lệ chốt */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm xl:col-span-3">
          <h3 className="mb-2 text-xs font-extrabold text-slate-800 sm:text-sm">
            Nguồn hội thoại & tỷ lệ chốt
          </h3>

          <div className="flex flex-col items-center justify-between gap-3 min-[420px]:flex-row xl:flex-col 2xl:flex-row">
            {/* Donut PieChart */}
            <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center sm:h-[130px] sm:w-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MOCK_SOURCE_PIE}
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {MOCK_SOURCE_PIE.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng
                </span>
                <span className="text-2xl font-black text-slate-800 leading-none">5.253</span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  hội thoại
                </span>
              </div>
            </div>

            {/* Source detailed specs */}
            <div className="flex-1 space-y-4 w-full min-w-0">
              {MOCK_SOURCE_PIE.map((src, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: src.color }}
                    />
                    <span className="truncate">{src.name}</span>
                  </div>
                  <div className="pl-4 text-xs space-y-0.5">
                    <p className="font-black text-slate-800">
                      {formatNumber(src.value)}{' '}
                      <span className="font-medium text-slate-400">
                        ({src.name === 'Quảng cáo' ? '35.3%' : '64.7%'})
                      </span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Chốt đơn:{' '}
                      <span className="font-bold text-indigo-600">{formatNumber(src.chotDon)}</span>{' '}
                      ({src.rate})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top sản phẩm được quan tâm nhiều */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm xl:col-span-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 text-xs font-extrabold text-slate-800 sm:text-sm">
              Top sản phẩm được quan tâm nhiều
            </h3>
            <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
              Xem tất cả
            </span>
          </div>

          <div className="space-y-2">
            {MOCK_TOP_PRODUCTS.map((p, index) => {
              const bgColors = [
                'bg-purple-100 text-purple-700',
                'bg-amber-100 text-amber-700',
                'bg-blue-100 text-blue-700',
                'bg-cyan-100 text-cyan-700',
                'bg-pink-100 text-pink-700',
              ]
              const progressColors = [
                'bg-purple-500',
                'bg-amber-500',
                'bg-blue-500',
                'bg-cyan-500',
                'bg-pink-500',
              ]
              // Scale the progress bar relative to the max count (1125 is index 0)
              const percentageFill = Math.round((p.count / 1125) * 100)

              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black',
                          bgColors[index]
                        )}
                      >
                        {p.id}
                      </span>
                      <span className="truncate font-semibold text-slate-700">{p.name}</span>
                    </div>
                    <span className="shrink-0 font-bold text-slate-800">
                      {formatNumber(p.count)}{' '}
                      <span className="text-slate-400 font-medium">({p.percent}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        progressColors[index]
                      )}
                      style={{ width: `${percentageFill}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Reihe 3: Effektivität & Funnel */}
      <div className="grid shrink-0 grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-4">
        {/* Hiệu quả theo Page */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 sm:text-sm">Hiệu quả theo Page</h3>
            <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
              Xem tất cả
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2 font-black">Page</th>
                  <th className="pb-2 text-right font-black">Hội thoại</th>
                  <th className="pb-2 text-center font-black">QA Score</th>
                  <th className="pb-2 text-right font-black">Tỷ lệ chốt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {MOCK_PAGE_EFFECTIVENESS.map((page, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="py-1.5 font-bold text-slate-700 flex items-center gap-1.5 min-w-0 max-w-[120px]">
                      <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-indigo-700 text-[9px] font-black text-white flex items-center justify-center shrink-0 uppercase">
                        {page.name.charAt(12)}
                      </div>
                      <span className="truncate">{page.name}</span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-800 tabular-nums">
                      {formatNumber(page.conversations)}
                    </td>
                    <td className="py-1.5 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-[28px] items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black',
                          page.qaScore >= 80
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        )}
                      >
                        {page.qaScore}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-800 tabular-nums">
                      {page.conversionRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phễu chăm sóc & chốt đơn */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-extrabold text-slate-800 sm:text-sm">
            Phễu chăm sóc & chốt đơn
          </h3>

          <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            {/* Left Column: Funnel blocks of centered decreasing width */}
            <div className="min-w-0 space-y-1.5">
              {MOCK_FUNNEL_STEPS.map((step, idx) => {
                const widths = ['w-full', 'w-[88%]', 'w-[76%]', 'w-[64%]', 'w-[52%]']
                return (
                  <div key={idx} className="flex justify-center">
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center h-8 text-white rounded-lg shadow-sm text-center px-2 bg-gradient-to-r',
                        widths[idx],
                        step.bg
                      )}
                    >
                      <span className="text-[9px] font-bold opacity-90 uppercase tracking-wider leading-none">
                        {step.name}
                      </span>
                      <span className="text-xs font-black tabular-nums mt-0.5">
                        {formatNumber(step.count)}{' '}
                        <span className="text-[10px] font-medium opacity-80">({step.percent})</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Column: Connection arrows pointing down with transition rate */}
            <div className="relative flex min-h-0 flex-row flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3 lg:flex-col lg:justify-around lg:border-l lg:border-t-0 lg:py-3 lg:pl-2 lg:pt-0">
              <div className="absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-blue-200 via-purple-200 to-emerald-200 lg:block" />
              {MOCK_FUNNEL_CONVERSIONS.map((conv, idx) => (
                <div
                  key={idx}
                  className="relative z-10 flex items-center gap-1.5 rounded-lg bg-white py-0.5 lg:-ml-[13px]"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                    <ChevronRight className="h-3 w-3 rotate-90" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                      Chuyển
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 leading-none mt-0.5">
                      {conv.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Khách hàng cần chăm sóc */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-extrabold text-slate-800 sm:text-sm">
            Khách hàng cần chăm sóc
          </h3>

          <div className="grid grid-cols-1 gap-1.5">
            {MOCK_CUSTOMERS_TO_CARE.map((item) => {
              let IconComponent = Search
              if (item.type === 'warranty') IconComponent = ShieldCheck
              else if (item.type === 'unclosed') IconComponent = Clock3
              else if (item.type === 'negative') IconComponent = Frown

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-2 shadow-sm transition duration-200 bg-white',
                    item.border,
                    item.bg
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm border',
                        item.border
                      )}
                    >
                      <IconComponent className={cn('h-4 w-4', item.text)} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{item.label}</span>
                  </div>
                  <span className={cn('text-lg font-black tabular-nums', item.text)}>
                    {item.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Xếp hạng nhân viên */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 sm:text-sm">
              Xếp hạng nhân viên (theo QA Score)
            </h3>
            <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
              Xem tất cả
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2 text-center font-black w-6">#</th>
                  <th className="pb-2 font-black">Nhân viên</th>
                  <th className="pb-2 text-center font-black">QA Score</th>
                  <th className="pb-2 text-right font-black">Tỷ lệ chốt</th>
                  <th className="pb-2 text-right font-black">Hội thoại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {MOCK_STAFF_RANKING.map((staff, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="py-2 text-center font-black text-slate-400">{staff.rank}</td>
                    <td className="py-2 font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[10px] font-black text-white flex items-center justify-center shrink-0">
                        {staff.avatar}
                      </div>
                      <span className="truncate flex items-center gap-1 min-w-0">
                        <span className="truncate">{staff.name}</span>
                        {staff.hasTrophy && <span className="shrink-0 text-xs">🏆</span>}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="inline-flex min-w-[28px] items-center justify-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-100">
                        {staff.qaScore}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-800 tabular-nums">
                      {staff.conversionRate}
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-800 tabular-nums">
                      {formatNumber(staff.conversations)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reihe 4: Sentiment & Aktivitäten */}
      <div className="grid shrink-0 grid-cols-1 gap-2 pb-1 md:grid-cols-2 2xl:grid-cols-4">
        {/* Cảm xúc khách hàng */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-2.5 shadow-sm">
          <h3 className="mb-1.5 text-xs font-extrabold text-slate-800 sm:text-sm">
            Cảm xúc khách hàng
          </h3>

          <div className="flex flex-col justify-between">
            {/* The Gauge Container */}
            <div className="relative flex h-[72px] w-full shrink-0 items-center justify-center overflow-hidden">
              <div className="absolute -bottom-[54px] h-[130px] w-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Tích cực', value: 78, color: '#10b981' },
                        { name: 'Trung tính', value: 16, color: '#f59e0b' },
                        { name: 'Tiêu cực', value: 6, color: '#ef4444' },
                      ]}
                      innerRadius={52}
                      outerRadius={68}
                      startAngle={180}
                      endAngle={0}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute bottom-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 leading-none">78%</span>
                <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-600">
                  Tích cực
                </span>
              </div>
            </div>

            {/* Smiley rows at bottom */}
            <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-slate-100/80 pt-1.5">
              <div className="flex flex-col items-center text-center">
                <div className="mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                  <Smile className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-800">78%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-none">
                  Tích cực
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 shadow-sm">
                  <Meh className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-800">16%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-none">
                  Trung tính
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-rose-100 bg-rose-50 text-rose-600 shadow-sm">
                  <Frown className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-800">6%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-none">
                  Tiêu cực
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Từ khóa nổi bật trong tháng */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-2.5 shadow-sm">
          <h3 className="mb-1.5 text-xs font-extrabold text-slate-800 sm:text-sm">
            Từ khóa nổi bật trong tháng
          </h3>

          <div className="grid grid-cols-2 gap-1">
            {MOCK_KEYWORDS.map((kw, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-slate-100/50 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm"
              >
                <span className="text-slate-400 font-bold shrink-0 mr-1 flex items-center">
                  # <span className="text-slate-600 font-bold ml-1">{kw.text}</span>
                </span>
                <span className="text-slate-800 font-black tabular-nums">{kw.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Xu hướng cảm xúc (CSAT) */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-2.5 shadow-sm">
          <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 sm:text-sm">
              Xu hướng cảm xúc (CSAT)
            </h3>
          </div>

          {/* Custom CSAT Legend */}
          <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Tích cực</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Trung tính</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Tiêu cực</span>
            </div>
          </div>

          {/* CSAT Stacked Bar Chart */}
          <div className="h-[96px] w-full sm:h-[104px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MOCK_SENTIMENT_TRENDS}
                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                  unit="%"
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar
                  dataKey="positive"
                  name="Tích cực"
                  stackId="a"
                  fill="#10b981"
                  barSize={14}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="neutral"
                  name="Trung tính"
                  stackId="a"
                  fill="#f59e0b"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="negative"
                  name="Tiêu cực"
                  stackId="a"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/60 bg-white p-2.5 shadow-sm">
          <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 sm:text-sm">Hoạt động gần đây</h3>
            <span className="text-[10px] font-bold text-indigo-600 cursor-pointer hover:underline">
              Xem tất cả
            </span>
          </div>

          {/* Timeline Feed Container */}
          <div className="space-y-1">
            {MOCK_RECENT_ACTIVITIES.slice(0, 4).map((act, index, arr) => {
              let dotColor = 'border-violet-500 bg-violet-100 text-violet-600'
              if (act.type === 'unclosed') dotColor = 'border-amber-400 bg-amber-50 text-amber-500'
              else if (act.type === 'closed-order' || act.type === 'warranty')
                dotColor = 'border-emerald-400 bg-emerald-50 text-emerald-500'
              else if (act.type === 'negative')
                dotColor = 'border-rose-400 bg-rose-50 text-rose-500'

              return (
                <div
                  key={index}
                  className="relative flex min-h-0 items-start gap-2 pl-3.5 text-[11px]"
                >
                  {/* Vertical line connecting timeline nodes */}
                  {index < arr.length - 1 && (
                    <div className="absolute bottom-[-6px] left-[5px] top-[12px] w-px bg-slate-100" />
                  )}
                  {/* Circle dot node */}
                  <div
                    className={cn(
                      'absolute left-0 top-[2px] flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 bg-white',
                      dotColor
                    )}
                  />

                  {/* Right hand description layout */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold tabular-nums text-slate-400">
                      {act.time}
                    </span>
                    <p className="mt-0.5 line-clamp-1 font-semibold leading-snug tracking-tight text-slate-600">
                      {/* Highlight specific sections in bold */}
                      {act.label.includes('#') ? (
                        <>
                          {act.label
                            .split(/(#\w+|\d+\s*điểm|\d+(?:\.\d+)*đ)/g)
                            .map((part, pidx) => {
                              if (
                                part.startsWith('#') ||
                                part.includes('điểm') ||
                                part.includes('đ')
                              ) {
                                return (
                                  <span
                                    key={pidx}
                                    className="font-extrabold text-slate-800 bg-slate-100 px-1 py-0.5 rounded text-[11px] inline-block mt-[-2px]"
                                  >
                                    {part}
                                  </span>
                                )
                              }
                              return part
                            })}
                        </>
                      ) : act.label.includes('khách') ? (
                        <>
                          {act.label.split(/(\d+\s*khách)/g).map((part, pidx) => {
                            if (part.includes('khách')) {
                              return (
                                <span
                                  key={pidx}
                                  className="font-extrabold text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[11px] inline-block mt-[-2px]"
                                >
                                  {part}
                                </span>
                              )
                            }
                            return part
                          })}
                        </>
                      ) : act.label.includes('tiêu cực') ? (
                        <>
                          {act.label.split(/(3\s*hội thoại)/g).map((part, pidx) => {
                            if (part.includes('hội thoại')) {
                              return (
                                <span
                                  key={pidx}
                                  className="font-extrabold text-rose-700 bg-rose-50 px-1 py-0.5 rounded text-[11px] inline-block mt-[-2px]"
                                >
                                  {part}
                                </span>
                              )
                            }
                            return part
                          })}
                        </>
                      ) : (
                        act.label
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigTab() {
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cskh', 'pages'],
    queryFn: fetchCskhPages,
  })

  const refreshMut = useMutation({
    mutationFn: refreshCskhOAuth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cskh'] }),
  })

  const pages = data?.pages ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-indigo-500" /> Đang tải cấu hình…
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1877F2] via-[#0866FF] to-indigo-700 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Link2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Kết nối Facebook</h3>
                <p className="text-sm text-blue-100">OAuth Meta — token Page bạn quản trị</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={getCskhOAuthStartUrl()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1877F2] shadow-md transition hover:bg-blue-50"
              >
                <Link2 className="h-4 w-4" /> Kết nối Facebook
              </a>
              <button
                type="button"
                disabled={!data?.oauthConnected || refreshMut.isPending}
                onClick={() => refreshMut.mutate()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              >
                {refreshMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Cập nhật kết nối Facebook
              </button>
            </div>
            {data?.oauthConnected ? (
              <div className="flex items-start gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p>
                    Đã kết nối: <strong>{data.oauthUser}</strong>
                  </p>
                  {data.oauthUpdatedAt && (
                    <p className="mt-0.5 text-xs text-blue-100">
                      Cập nhật {new Date(data.oauthUpdatedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-100">Chưa kết nối — bấm nút trên để bắt đầu.</p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Facebook Pages</h3>
          {pages.length ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {pages.length.toLocaleString('vi-VN')} Page đã kết nối — chọn kênh khi chấm điểm ở tab
              Chấm điểm.
            </p>
          ) : null}
        </div>

        {!pages.length ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Chưa có Page — kết nối Facebook ở trên.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pages.map((p) => (
              <li key={p.pageId} className="flex items-center gap-3 px-5 py-4">
                <CskhPageAvatar
                  name={p.pageName || p.pageId}
                  pictureUrl={p.pagePictureUrl}
                  pageId={p.pageId}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{p.pageName || p.pageId}</p>
                  <p className="truncate text-xs text-slate-400">ID: {p.pageId}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void refetch()}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        Tải lại danh sách
      </button>
    </div>
  )
}

function SparklinePath({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 60
  const height = 14
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="w-16 h-4" width={width} height={height}>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function CircularProgress({
  score,
  label,
  color = '#10b981',
}: {
  score: number
  label: string
  color?: string
}) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  return (
    <div className="relative flex items-center justify-center h-16 w-16">
      <svg className="transform -rotate-90 w-16 h-16">
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="stroke-slate-100"
          strokeWidth="3.5"
          fill="transparent"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-[10px] font-black text-slate-800 leading-none">
          {score}
          <span className="text-[7px] font-bold text-slate-400">/100</span>
        </span>
        <span className="text-[7px] font-black text-emerald-600 mt-0.5 uppercase tracking-wider scale-90 leading-none">
          {label}
        </span>
      </div>
    </div>
  )
}

function FbPageTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTimeframe, setActiveTimeframe] = useState<'day' | 'week' | 'month'>('day')

  const filteredPages = MOCK_FB_PAGES_LIST.filter(
    (page) =>
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.handle.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 p-5 sm:p-6 bg-[#f4f7fc]">
      {/* Header and Filter Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-150 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
              <Facebook className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                Page (Facebook)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                Quản lý và đánh giá hiệu suất tất cả page Facebook
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Filters mimicking the screenshot */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Calendar Display */}
          <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-700 font-bold shadow-sm cursor-pointer hover:bg-slate-50 transition">
            <span>01/05/2026 - 31/05/2026</span>
            <span className="text-slate-400">📅</span>
          </div>

          {/* Team Dropdown */}
          <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-700 font-bold shadow-sm cursor-pointer hover:bg-slate-50 transition">
            <span>Tất cả team</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Filters Button */}
          <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-700 font-bold shadow-sm cursor-pointer hover:bg-slate-50 transition">
            <span>Bộ lọc</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Updated time status */}
          <div className="flex items-center gap-1 text-slate-400 font-bold px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            <span>Cập nhật lúc 10:30</span>
          </div>
        </div>
      </div>

      {/* Row 1: KPI-Karten (5 cards + 1 gauge) */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
          Tổng quan hiệu suất toàn bộ Page
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {MOCK_FB_KPI_CARDS.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm flex flex-col justify-between h-[120px] transition hover:shadow-md duration-200"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <h3 className="mt-1.5 text-2xl font-black text-slate-800 tracking-tight leading-none">
                  {card.value}
                </h3>
              </div>
              <div className="space-y-0.5 mt-auto">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 leading-none">
                  {card.trend}
                </span>
                <p className="text-[9px] text-slate-400 font-bold truncate">{card.comparison}</p>
              </div>
            </div>
          ))}

          {/* Gauge Card 6 (Chất lượng AI) */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm flex items-center justify-between h-[120px] transition hover:shadow-md duration-200">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Chất lượng (AI)
              </span>
              <span className="text-xs font-black text-emerald-600 mt-2 inline-block bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                Đạt 92/100
              </span>
            </div>
            <div className="shrink-0">
              <CircularProgress score={92} label="Rất tốt" color="#10b981" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Bottom layout (Left: 70% | Right: 30%) */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-10">
        {/* Left Side (col-span-7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Table Card (Danh sách Page Facebook) */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Danh sách Page Facebook</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {/* Search box */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm page..."
                    className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] font-bold shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-150 w-[140px] sm:w-[180px]"
                  />
                </div>

                {/* Dropdown tháng này */}
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition">
                  <span>Tháng này</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  title="Tải báo cáo"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto min-h-0 [scrollbar-width:thin]">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 font-black">Page</th>
                    <th className="pb-2.5 text-center font-black">Trạng thái</th>
                    <th className="pb-2.5 text-right font-black">Tổng tin nhắn</th>
                    <th className="pb-2.5 text-right font-black">Tin nhắn từ QC</th>
                    <th className="pb-2.5 text-center font-black">% từ QC</th>
                    <th className="pb-2.5 text-right font-black">Tỷ lệ phản hồi</th>
                    <th className="pb-2.5 text-right font-black">Tỷ lệ chốt</th>
                    <th className="pb-2.5 text-right font-black">Doanh thu</th>
                    <th className="pb-2.5 text-center font-black">Chất lượng (AI)</th>
                    <th className="pb-2.5 text-center font-black">Xu hướng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {filteredPages.map((page, idx) => {
                    const isInactive = page.status === 'inactive'
                    return (
                      <tr key={idx} className="text-xs hover:bg-slate-50/50 transition">
                        {/* Page logo and metadata */}
                        <td className="py-3 font-bold text-slate-700 flex items-center gap-2 min-w-0 max-w-[150px]">
                          <div
                            className={cn(
                              'h-7 w-7 rounded-full text-[10px] font-black text-white flex items-center justify-center shrink-0 uppercase',
                              isInactive
                                ? 'bg-slate-300'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm'
                            )}
                          >
                            {page.name.charAt(0)}
                          </div>
                          <div className="min-w-0 leading-none">
                            <span className="truncate block font-black text-slate-800 text-[11px]">
                              {page.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              {page.handle}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold border',
                              isInactive
                                ? 'bg-slate-50 text-slate-400 border-slate-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            )}
                          >
                            {isInactive ? 'Ngừng hoạt động' : 'Đang hoạt động'}
                          </span>
                        </td>

                        {/* Metrics with mini-trends below */}
                        <td className="py-3 text-right">
                          <span className="font-black text-slate-800 text-[11px] block leading-none">
                            {formatNumber(page.totalMsg)}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold block mt-1 leading-none',
                              page.totalTrend.includes('↓') ? 'text-rose-500' : 'text-emerald-500'
                            )}
                          >
                            {page.totalTrend}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <span className="font-black text-slate-800 text-[11px] block leading-none">
                            {formatNumber(page.adMsg)}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold block mt-1 leading-none',
                              page.adTrend.includes('↓') ? 'text-rose-500' : 'text-emerald-500'
                            )}
                          >
                            {page.adTrend}
                          </span>
                        </td>

                        {/* % from ads */}
                        <td className="py-3 text-center font-extrabold text-slate-800 tabular-nums">
                          {page.adPercent}
                        </td>

                        {/* Response Rate */}
                        <td className="py-3 text-right">
                          <span className="font-black text-slate-800 text-[11px] block leading-none">
                            {page.responseRate}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold block mt-1 leading-none',
                              page.responseTrend.includes('↓')
                                ? 'text-rose-500'
                                : 'text-emerald-500'
                            )}
                          >
                            {page.responseTrend}
                          </span>
                        </td>

                        {/* Closing Rate */}
                        <td className="py-3 text-right">
                          <span className="font-black text-slate-800 text-[11px] block leading-none">
                            {page.closingRate}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold block mt-1 leading-none',
                              page.closingTrend.includes('↓') ? 'text-rose-500' : 'text-emerald-500'
                            )}
                          >
                            {page.closingTrend}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="py-3 text-right">
                          <span className="font-black text-slate-800 text-[11px] block leading-none">
                            {page.revenue}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold block mt-1 leading-none',
                              page.revenueTrend.includes('↓') ? 'text-rose-500' : 'text-emerald-500'
                            )}
                          >
                            {page.revenueTrend}
                          </span>
                        </td>

                        {/* AI Quality badge */}
                        <td className="py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex min-w-[28px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black',
                              page.quality >= 85
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : page.quality >= 75
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-rose-50 text-rose-600 border border-rose-100'
                            )}
                          >
                            {page.quality}
                          </span>
                        </td>

                        {/* Xu hướng Sparkline */}
                        <td className="py-3 text-center">
                          <div className="flex justify-center">
                            <SparklinePath
                              data={page.trendData}
                              stroke={page.isPositiveTrend ? '#10b981' : '#ef4444'}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid for Message LineChart & Donut Chart */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            {/* Biểu đồ tin nhắn */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col justify-between h-[300px]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-extrabold text-slate-800 text-sm">Biểu đồ tin nhắn</h3>
                {/* Timeframe tab selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-black text-slate-500">
                  <span
                    onClick={() => setActiveTimeframe('day')}
                    className={cn(
                      'px-2 py-1 rounded-md cursor-pointer transition',
                      activeTimeframe === 'day'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'hover:text-slate-800'
                    )}
                  >
                    Ngày
                  </span>
                  <span
                    onClick={() => setActiveTimeframe('week')}
                    className={cn(
                      'px-2 py-1 rounded-md cursor-pointer transition',
                      activeTimeframe === 'week'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'hover:text-slate-800'
                    )}
                  >
                    Tuần
                  </span>
                  <span
                    onClick={() => setActiveTimeframe('month')}
                    className={cn(
                      'px-2 py-1 rounded-md cursor-pointer transition',
                      activeTimeframe === 'month'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'hover:text-slate-800'
                    )}
                  >
                    Tháng
                  </span>
                </div>
              </div>

              {/* Legend matching screenshot */}
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>Tổng tin nhắn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Tin nhắn từ quảng cáo</span>
                </div>
              </div>

              {/* Message Chart */}
              <div className="h-[190px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={MOCK_FB_MESSAGE_TREND}
                    margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fontWeight: 500, fill: '#94a3b8' }}
                    />
                    <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Tổng tin nhắn"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ad"
                      name="Tin nhắn từ quảng cáo"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tỷ lệ tin nhắn từ quảng cáo Donut */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col h-[300px]">
              <h3 className="font-extrabold text-slate-800 text-sm mb-4">
                Tỷ lệ tin nhắn từ quảng cáo
              </h3>

              <div className="flex items-center justify-around gap-4 my-auto h-full">
                {/* Donut chart */}
                <div className="relative h-[160px] w-[160px] flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={MOCK_FB_SOURCE_PIE}
                        innerRadius={50}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {MOCK_FB_SOURCE_PIE.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-850 leading-none">60.8%</span>
                    <span className="text-[8px] font-black text-emerald-600 mt-1 uppercase tracking-wider text-center max-w-[80px] leading-tight">
                      Tin nhắn từ quảng cáo
                    </span>
                  </div>
                </div>

                {/* Legend specs */}
                <div className="space-y-4 min-w-0">
                  {MOCK_FB_SOURCE_PIE.map((src, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: src.color }}
                        />
                        <span className="truncate">{src.name}</span>
                      </div>
                      <p className="pl-4 font-black text-slate-850 text-xs">
                        {formatNumber(src.value)}
                        <span className="font-medium text-slate-400 ml-1.5">
                          ({idx === 0 ? '60.8%' : '39.2%'})
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (col-span-3) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Hiệu suất tin nhắn từ quảng cáo */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Hiệu suất tin nhắn từ quảng cáo
              </h3>
              <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
                Chi tiết
              </span>
            </div>

            {/* Vertically stacked items */}
            <div className="space-y-3">
              {MOCK_FB_AD_METRICS.map((item) => {
                let iconComponent = <MessageCircle className="h-4 w-4" />
                let bgBox = 'bg-blue-50 text-blue-600 border border-blue-100/50'

                if (item.id === 'ad-cost') {
                  iconComponent = <DollarSign className="h-4 w-4" />
                  bgBox = 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                } else if (item.id === 'ad-cpm') {
                  iconComponent = <TrendingDown className="h-4 w-4" />
                  bgBox = 'bg-rose-50 text-rose-600 border border-rose-100/50'
                } else if (item.id === 'ad-quality') {
                  iconComponent = <Award className="h-4 w-4" />
                  bgBox = 'bg-purple-50 text-purple-600 border border-purple-100/50'
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 shadow-sm hover:bg-slate-50/40 transition duration-150"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                          bgBox
                        )}
                      >
                        {iconComponent}
                      </div>
                      <div className="min-w-0 leading-none">
                        <span className="text-[10px] font-bold text-slate-400 block truncate">
                          {item.label}
                        </span>
                        <span className="font-black text-slate-800 mt-1 block text-sm leading-none">
                          {item.value}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shrink-0',
                        item.isPositive
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      )}
                    >
                      {item.trend}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Blue Info Alerts Box */}
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-blue-50/50 border border-blue-100/60 p-3.5 text-xs text-blue-800 shadow-inner">
              <span className="text-blue-500 font-bold scale-110">💡</span>
              <p className="leading-relaxed font-bold text-slate-600 text-[11px]">
                Tin nhắn từ quảng cáo chiếm <span className="font-black text-blue-600">60.8%</span>{' '}
                tổng tin nhắn và mang lại <span className="font-black text-blue-600">62.3%</span>{' '}
                doanh thu toàn bộ hệ thống.
              </p>
            </div>
          </div>

          {/* Top quảng cáo mang lại nhiều tin nhắn */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Top quảng cáo mang lại nhiều tin nhắn
              </h3>
              <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
                Xem tất cả
              </span>
            </div>

            {/* Item Rows with Thumbnails */}
            <div className="space-y-3.5 my-auto">
              {MOCK_FB_TOP_ADS.map((ad, idx) => {
                const colors = [
                  'bg-purple-100 border-purple-200 text-purple-700',
                  'bg-amber-100 border-amber-200 text-amber-700',
                  'bg-blue-100 border-blue-200 text-blue-700',
                  'bg-cyan-100 border-cyan-200 text-cyan-700',
                  'bg-pink-100 border-pink-200 text-pink-700',
                ]
                return (
                  <div key={ad.id} className="flex items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Emoji visual thumb box */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base shadow-inner border',
                          colors[idx % colors.length]
                        )}
                      >
                        {ad.image}
                      </div>
                      <div className="min-w-0 leading-none">
                        <span className="font-black text-slate-800 truncate block text-[11px]">
                          {ad.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold truncate block mt-0.5">
                          {ad.page}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 leading-none">
                      <span className="font-black text-slate-850 tabular-nums block text-[11px]">
                        {formatNumber(ad.messages)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                        {ad.cost} <span className="font-medium text-[8px]">/tin</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Insight về Page */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm mb-4">AI Insight về Page</h3>

            <div className="space-y-3 flex-1 flex flex-col justify-center my-auto">
              {MOCK_FB_AI_INSIGHTS.map((ins) => {
                let statusDotColor = 'bg-emerald-500'
                let bulletBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                let bulletIcon = '🌿'

                if (ins.type === 'info') {
                  statusDotColor = 'bg-blue-500'
                  bulletBg = 'bg-blue-50 text-blue-600 border border-blue-100'
                  bulletIcon = '⭐'
                } else if (ins.type === 'warning') {
                  statusDotColor = 'bg-amber-500'
                  bulletBg = 'bg-amber-50 text-amber-600 border border-amber-100'
                  bulletIcon = '⚠️'
                } else if (ins.type === 'tip') {
                  statusDotColor = 'bg-purple-500'
                  bulletBg = 'bg-purple-50 text-purple-600 border border-purple-100'
                  bulletIcon = '💡'
                }

                return (
                  <div
                    key={ins.id}
                    className="flex gap-2.5 items-start text-[11px] p-2 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition border border-slate-100"
                  >
                    {/* Circle Bullet Badge */}
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold shrink-0 shadow-sm',
                        bulletBg
                      )}
                    >
                      {bulletIcon}
                    </div>

                    <p className="text-slate-600 font-bold leading-relaxed tracking-tight">
                      {ins.text
                        .split(
                          /(Vienchibao\s+\w+|VB\s+\w+|Nhẫn bạc Classic|\d+(?:\.\d+)?%|\d+\/\d+)/g
                        )
                        .map((part, pidx) => {
                          if (
                            part.startsWith('Vienchibao') ||
                            part.startsWith('VB') ||
                            part === 'Nhẫn bạc Classic' ||
                            part.includes('%') ||
                            part.includes('/')
                          ) {
                            return (
                              <span key={pidx} className="font-extrabold text-slate-800">
                                {part}
                              </span>
                            )
                          }
                          return part
                        })}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-100 mt-4 pt-3 text-center shrink-0">
              <span className="text-xs font-black text-indigo-600 cursor-pointer hover:underline flex items-center justify-center gap-1">
                Xem tất cả insight <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export function CskhQualityPage() {
  const { tab: tabParam } = cskhQualityRoute.useSearch()
  const tab =
    tabParam === 'config'
      ? 'config'
      : tabParam === 'audit'
        ? 'audit'
        : tabParam === 'fb-page'
          ? 'fb-page'
          : 'overview'
  const [auditJobBusy, setAuditJobBusy] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('tab') === 'monitor') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'audit')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const running = await fetchRunningCskhJob('audit')
        setAuditJobBusy(running?.status === 'running')
        if (running?.status !== 'running') {
          sessionStorage.removeItem(AUDIT_JOB_KEY)
        }
      } catch {
        setAuditJobBusy(false)
        sessionStorage.removeItem(AUDIT_JOB_KEY)
      }
    })()
    const p = new URLSearchParams(window.location.search)
    if (p.get('fb_connected') || p.get('oauth_error')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('fb_connected')
      url.searchParams.delete('oauth_error')
      if (p.get('tab') === 'monitor') url.searchParams.set('tab', 'audit')
      if (!url.searchParams.get('tab')) url.searchParams.set('tab', 'config')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  return (
    <CskhPageShell
      className={
        tab === 'audit'
          ? undefined
          : tab === 'overview'
            ? 'h-full min-h-0 flex-1'
            : '!h-auto min-h-0 flex-none overflow-visible'
      }
    >
      {auditJobBusy && tab === 'audit' ? (
        <p className="mb-2 text-xs font-medium text-indigo-600">Đang quét và chấm điểm…</p>
      ) : null}

      <CskhGlassPanel
        className={
          tab === 'audit'
            ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden'
            : tab === 'overview'
              ? 'flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-1 [scrollbar-width:thin]'
              : 'min-h-0 overflow-x-hidden overflow-y-auto'
        }
      >
        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'fb-page' ? <FbPageTab /> : null}
        {tab === 'config' ? <ConfigTab /> : null}
        {tab === 'audit' ? <AuditMessengerView onAuditJobActiveChange={setAuditJobBusy} /> : null}
      </CskhGlassPanel>
    </CskhPageShell>
  )
}
