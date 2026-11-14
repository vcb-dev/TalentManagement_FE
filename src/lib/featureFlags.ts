/**
 * Bật/tắt toàn bộ phân hệ KPI/OKR trên giao diện: menu Set KPI/OKR, Chỉ số vinh danh,
 * Duyệt KPI theo team, Tuân thủ KPI/OKR, Cửa sổ KPI/OKR, tab KPI · OKR + slide vinh danh
 * trên dashboard, cờ KPI trong Phòng ban & nhóm. Route KPI bị chặn (redirect về trang mặc định).
 * Đặt `false` để ẩn — dữ liệu/API backend không bị ảnh hưởng.
 */
export const KPI_OKR_ENABLED = false

/**
 * Bật/tắt màn Báo cáo hàng tháng (`/monthly-report` — tab KPI/OKR + Tổng kết): menu + route.
 * Đặt `false` để ẩn — dữ liệu/API backend không bị ảnh hưởng.
 */
export const MONTHLY_REPORT_ENABLED = false

/**
 * Bật/tắt mục menu "Lộ trình học" (`/learning-path` — lộ trình cấp/sao): chỉ ẩn menu,
 * route vẫn mở được vì nút "Mở lộ trình học" trên dashboard còn dẫn tới.
 * Đặt `false` để ẩn — dữ liệu/API backend không bị ảnh hưởng.
 */
export const LEARNING_PATH_NAV_ENABLED = false
