/** UUID cố định cho dropdown phòng ban / team (mock & dev; backend thật có thể thay bằng API). */
export const HR_DEPARTMENT_OPTIONS = [
  { value: '11111111-1111-4111-8111-111111111111', label: 'Kinh doanh' },
  { value: '22222222-2222-4222-8222-222222222221', label: 'Marketing' },
  { value: '33333333-3333-4333-8333-333333333333', label: 'Sản xuất' },
  { value: '44444444-4444-4444-8444-444444444444', label: 'Hậu cần' },
  { value: '55555555-5555-4555-8555-555555555555', label: 'Nhân sự' },
] as const

export const HR_TEAM_OPTIONS = [
  { value: '22222222-2222-4222-8222-222222222222', label: 'Team KD-01' },
  { value: '66666666-6666-4666-8666-666666666666', label: 'Team KD-02' },
  { value: '77777777-7777-4777-8777-777777777777', label: 'Team MK-01' },
] as const

export const DEFAULT_DEPARTMENT_ID = HR_DEPARTMENT_OPTIONS[0].value
export const DEFAULT_TEAM_ID = HR_TEAM_OPTIONS[0].value
