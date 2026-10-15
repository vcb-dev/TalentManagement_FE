import { describe, expect, it } from 'vitest'
import { validateCvFile } from '../components/CvAttachmentField'
import { createEmployeeFormSchema } from '../schemas'

const BASE = {
  name: 'Nguyễn Văn A',
  email: 'nguyenvana@gmail.com',
  role: 'MEMBER',
  departmentId: '11111111-1111-4111-8111-111111111111',
  teamId: '22222222-2222-4222-8222-222222222222',
  phone: '',
  birthDate: '2000-01-01',
  startDate: '2026-10-01',
  hometownDetail: 'Phú Thọ',
  managerBlockCode: '1',
}

function issuePaths(input: Record<string, unknown>): string[] {
  const res = createEmployeeFormSchema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => i.path.join('.'))
}

describe('tạo nhân sự — nhóm và mã nhân viên', () => {
  it('vai trò thường: bắt buộc chọn nhóm, không cần mã', () => {
    expect(issuePaths(BASE)).toEqual([])
    expect(issuePaths({ ...BASE, teamId: '' })).toEqual(['teamId'])
  })

  it('BOD: không cần nhóm nhưng phải nhập mã nhân viên', () => {
    expect(issuePaths({ ...BASE, role: 'BOD', teamId: '' })).toEqual(['employeeCodePrimary'])
    expect(
      issuePaths({ ...BASE, role: 'BOD', teamId: '', employeeCodePrimary: '102 1994 2500' })
    ).toEqual([])
  })

  it('BOD: mã phải 11–12 chữ số', () => {
    for (const bad of ['0316922500', 'A046', '1021994250012']) {
      expect(issuePaths({ ...BASE, role: 'BOD', teamId: '', employeeCodePrimary: bad })).toEqual([
        'employeeCodePrimary',
      ])
    }
  })
})

describe('validateCvFile', () => {
  const file = (name: string, type: string, size = 1024) => ({ name, type, size })

  it('nhận PDF, Word, ảnh', () => {
    expect(validateCvFile(file('CV.pdf', 'application/pdf'))).toBeNull()
    expect(validateCvFile(file('CV.doc', 'application/msword'))).toBeNull()
    expect(
      validateCvFile(
        file('CV.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      )
    ).toBeNull()
    expect(validateCvFile(file('cv.png', 'image/png'))).toBeNull()
  })

  it('MIME trống: nhận theo đuôi file Word/PDF', () => {
    expect(validateCvFile(file('CV Mai.DOCX', ''))).toBeNull()
    expect(validateCvFile(file('cv.exe', ''))).toMatch(/CV chỉ nhận/)
  })

  it('từ chối loại khác và file quá 10MB', () => {
    expect(validateCvFile(file('cv.txt', 'text/plain'))).toMatch(/CV chỉ nhận/)
    expect(validateCvFile(file('cv.pdf', 'application/pdf', 11 * 1024 * 1024))).toMatch(/quá lớn/)
  })
})
