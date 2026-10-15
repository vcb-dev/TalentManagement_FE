import { describe, expect, it } from 'vitest'
import {
  EMPLOYEE_CODE_INPUT_KEYS,
  employeeCodeInputRequiredMessage,
  isEmployeeCodeInputField,
  roleMayHaveNoTeam,
  USER_SELF_FORM_SECTIONS,
} from '../userSelfFormLayout'

describe('đầu vào sinh mã nhân viên', () => {
  it('đủ 5 field của công thức và field nào cũng có trên form hồ sơ', () => {
    const formKeys = USER_SELF_FORM_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))
    expect([...EMPLOYEE_CODE_INPUT_KEYS].sort()).toEqual(
      ['birthDate', 'hometownDetail', 'managerBlockCode', 'startDateWork', 'teamId'].sort()
    )
    for (const key of EMPLOYEE_CODE_INPUT_KEYS) expect(formKeys).toContain(key)
  })

  it('chỉ nhận đúng các field đầu vào', () => {
    expect(isEmployeeCodeInputField('hometownDetail')).toBe(true)
    expect(isEmployeeCodeInputField('addressCurrent')).toBe(false)
    expect(isEmployeeCodeInputField('employeeCodePrimary')).toBe(false)
  })

  it('chỉ Quản lý/BOD được bỏ trống nhóm', () => {
    expect(roleMayHaveNoTeam('MANAGER')).toBe(true)
    expect(roleMayHaveNoTeam('BOD')).toBe(true)
    for (const role of ['MEMBER', 'LEADER', 'HR', 'TEACHER', '', null, undefined]) {
      expect(roleMayHaveNoTeam(role)).toBe(false)
    }
  })

  it('thông báo nêu rõ lý do bắt buộc', () => {
    expect(employeeCodeInputRequiredMessage('Quê quán / quê hương')).toBe(
      'Quê quán / quê hương là bắt buộc (dùng để sinh mã nhân viên)'
    )
  })
})
