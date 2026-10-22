/**
 * Loại hợp đồng / vị trí — dùng chung giữa form Thêm mới và Chỉnh sửa nhân sự.
 * Mỗi loại một cách viết duy nhất: BE chuẩn hoá biến thể từ file HR/Lark ("Partime",
 * "Fulltime -Thử việc", "Fulltime Chính thức") về các giá trị dưới đây (`normalizeTeamPosition`).
 */
export const teamPositionOptions = [
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Full-time thử việc', label: 'Full-time thử việc' },
  { value: 'Full-time chính thức', label: 'Full-time chính thức' },
  { value: 'Thực tập sinh', label: 'Thực tập sinh' },
  { value: 'Trưởng nhóm', label: 'Trưởng nhóm' },
  { value: 'Quản lý', label: 'Quản lý' },
  { value: 'Chuyên gia', label: 'Chuyên gia' },
  { value: 'BOD', label: 'BOD' },
  { value: 'Học việc', label: 'Học việc' },
  { value: 'Nhân sự thời vụ', label: 'Nhân sự thời vụ' },
  { value: 'Khác', label: 'Khác' },
]
