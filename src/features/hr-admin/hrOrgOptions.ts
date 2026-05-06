/**
 * UUID co dinh cho dropdown phong ban / team (mock & dev; backend seed khop TalentManagement_BE/prisma/seed.ts).
 * Cau truc: KHOI MARKETING TRAFFIC (12 team), KHOI KINH DOANH (8 team), cac phong con lai 1 team (ten phong = ten team).
 */

/** Phong ban */
export const HR_DEPARTMENT_IDS = {
  khoiMarketingTraffic: '01c0c0c0-0001-4001-8001-000000000011',
  teamQuanTriPhatTrienNhanTai: '01c0c0c0-0001-4001-8001-000000000012',
  nghienCuuPhatTrienSanPham: '01c0c0c0-0001-4001-8001-000000000013',
  teamLogistics: '01c0c0c0-0001-4001-8001-000000000014',
  teamSanXuat: '01c0c0c0-0001-4001-8001-000000000015',
  teamHanhChinhKeToan: '01c0c0c0-0001-4001-8001-000000000016',
  khoiKinhDoanh: '01c0c0c0-0001-4001-8001-000000000017',
} as const

const D = HR_DEPARTMENT_IDS

/** Ten hien thi dung tieng Viet (unicode escape de tranh loi encoding tool). */
export const HR_DEPARTMENT_OPTIONS = [
  { value: D.khoiMarketingTraffic, label: 'KH\u1ED0I MARKETING TRAFFIC' },
  {
    value: D.teamQuanTriPhatTrienNhanTai,
    label: 'TEAM QU\u1EA2N TR\u1ECA V\u00C0 PH\u00C1T TRI\u1EC2N NH\u00C2N T\u00C0I',
  },
  {
    value: D.nghienCuuPhatTrienSanPham,
    label: 'NGHI\u00CAN C\u1EE8U V\u00C0 PH\u00C1T TRI\u1EC2N S\u1EA2N PH\u1EA8M',
  },
  { value: D.teamLogistics, label: 'TEAM LOGISTICS' },
  { value: D.teamSanXuat, label: 'TEAM S\u1EA2N XU\u1EA4T' },
  { value: D.teamHanhChinhKeToan, label: 'TEAM H\u00C0NH CH\u00CDNH - K\u1EBE TO\u00C1N' },
  { value: D.khoiKinhDoanh, label: 'KH\u1ED0I KINH DOANH' },
] as const

export type HrTeamOption = {
  value: string
  label: string
  departmentId: string
}

/** Team (kem departmentId de mock tree / select loc theo phong ban). */
export const HR_TEAM_OPTIONS: readonly HrTeamOption[] = [
  // KHOI MARKETING TRAFFIC (12)
  {
    value: '02d0d0d0-0001-4001-8001-000000000101',
    label: 'HUYK0',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000102',
    label: 'HUYK1',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000103',
    label: 'HUYK2',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000104',
    label: 'Global Japan',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000105',
    label: 'Global Indo',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000106',
    label: 'Global Th\u00E1i Lan',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000107',
    label: 'Global \u0110\u00E0i Loan',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000108',
    label: 'MEDIA',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000109',
    label: 'Scale Data',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-00000000010a',
    label: 'ADS',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-00000000010b',
    label: 'TM\u0110T',
    departmentId: D.khoiMarketingTraffic,
  },
  {
    value: '02d0d0d0-0001-4001-8001-00000000010c',
    label: 'C\u00F4ng ngh\u1EC7 v\u00E0 d\u1EEF li\u1EC7u',
    departmentId: D.khoiMarketingTraffic,
  },
  // Phong 1 team: ten team = ten phong ban
  {
    value: '02d0d0d0-0001-4001-8001-000000000201',
    label: 'TEAM QU\u1EA2N TR\u1ECA V\u00C0 PH\u00C1T TRI\u1EC2N NH\u00C2N T\u00C0I',
    departmentId: D.teamQuanTriPhatTrienNhanTai,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000202',
    label: 'NGHI\u00CAN C\u1EE8U V\u00C0 PH\u00C1T TRI\u1EC2N S\u1EA2N PH\u1EA8M',
    departmentId: D.nghienCuuPhatTrienSanPham,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000203',
    label: 'TEAM LOGISTICS',
    departmentId: D.teamLogistics,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000204',
    label: 'TEAM S\u1EA2N XU\u1EA4T',
    departmentId: D.teamSanXuat,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000205',
    label: 'TEAM H\u00C0NH CH\u00CDNH - K\u1EBE TO\u00C1N',
    departmentId: D.teamHanhChinhKeToan,
  },
  // KHOI KINH DOANH (8)
  {
    value: '02d0d0d0-0001-4001-8001-000000000301',
    label: 'LIVESTREAM 1',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000302',
    label: 'LIVESTREAM 2',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000303',
    label: 'TEAM C\u1EECA H\u00C0NG',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000304',
    label: 'KINH DOANH 1',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000305',
    label: 'KINH DOANH 2',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000306',
    label: 'KINH DOANH 3',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000307',
    label: 'CSKH \u0110\u1ED2 DA',
    departmentId: D.khoiKinhDoanh,
  },
  {
    value: '02d0d0d0-0001-4001-8001-000000000308',
    label: 'KINH DOANH GLOBAL',
    departmentId: D.khoiKinhDoanh,
  },
  // Phòng Vận đơn
  {
    value: '02d0d0d0-0001-4001-8001-000000000309',
    label: 'VẬN ĐƠN',
    departmentId: D.teamLogistics,
  },
]

export const DEFAULT_DEPARTMENT_ID = HR_DEPARTMENT_IDS.khoiMarketingTraffic
export const DEFAULT_TEAM_ID = '02d0d0d0-0001-4001-8001-000000000101'
