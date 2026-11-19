/**
 * Loại hợp đồng / vị trí — dùng chung giữa form Thêm mới và Chỉnh sửa nhân sự.
 * Mỗi loại một cách viết duy nhất: BE chuẩn hoá biến thể từ file HR/Lark ("Partime",
 * "Fulltime -Thử việc", "Fulltime Chính thức") về các giá trị dưới đây (`normalizeTeamPosition`).
 * Trưởng nhóm / Quản lý / Chuyên gia / BOD là Chức vụ (danh mục `employee_positions`), không phải
 * loại hợp đồng — migration 20261119 đã chuyển dữ liệu cũ sang Chức vụ.
 */
export const teamPositionOptions = [
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Full-time thử việc', label: 'Full-time thử việc' },
  { value: 'Full-time chính thức', label: 'Full-time chính thức' },
  { value: 'Thực tập sinh', label: 'Thực tập sinh' },
  { value: 'Học việc', label: 'Học việc' },
  { value: 'Nhân sự thời vụ', label: 'Nhân sự thời vụ' },
  { value: 'Khác', label: 'Khác' },
]
