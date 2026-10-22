import type { EmployeeOrderNumber } from './api'

export const EMPLOYEE_ORDER_NUMBER_RULE =
  'Tự động đánh số tăng dần theo ngày bắt đầu làm việc — trong dự án đang tham gia, không có dự án thì trong team.'

/** Dòng giải thích dưới ô "Số thứ tự": nhóm đang xét, hoặc lý do chưa có số. */
export function employeeOrderNumberHint(o: EmployeeOrderNumber): string {
  if (o.position !== null) {
    const name = o.groupName?.trim()
    const group = o.scope === 'PROJECT' ? 'dự án' : 'team'
    return `Theo ${group}${name ? ` ${name}` : ''} · ${o.total} người`
  }
  if (o.reason === 'INACTIVE') return 'Đã nghỉ việc nên không đánh số'
  if (o.reason === 'NO_START_DATE') return 'Cần nhập ngày bắt đầu làm việc để đánh số'
  return 'Chưa thuộc dự án hoặc team nào'
}
