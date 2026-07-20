/**
 * Loại hợp đồng / vị trí — dùng chung giữa form Thêm mới và Chỉnh sửa nhân sự.
 * Gồm 5 giá trị chuẩn (dùng khi tạo mới) + các giá trị gốc từ dữ liệu Lark/xlsx đã seed
 * (cách viết khác — "Fulltime Chính thức", "Partime", ...) để dropdown không hiện trống
 * với nhân sự cũ đã có dữ liệu thật nhưng khác chính tả.
 */
export const teamPositionOptions = [
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Partime', label: 'Partime' },
  { value: 'Full-time thử việc', label: 'Full-time thử việc' },
  { value: 'Fulltime -Thử việc', label: 'Fulltime -Thử việc' },
  { value: 'Full-time chính thức', label: 'Full-time chính thức' },
  { value: 'Fulltime Chính thức', label: 'Fulltime Chính thức' },
  { value: 'Thực tập sinh', label: 'Thực tập sinh' },
  { value: 'Trưởng nhóm', label: 'Trưởng nhóm' },
  { value: 'Quản lý', label: 'Quản lý' },
  { value: 'Chuyên gia', label: 'Chuyên gia' },
  { value: 'BOD', label: 'BOD' },
  { value: 'Học việc', label: 'Học việc' },
  { value: 'Nhân sự thời vụ', label: 'Nhân sự thời vụ' },
  { value: 'Khác', label: 'Khác' },
]
