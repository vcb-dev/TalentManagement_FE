import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'src')

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (name.endsWith('.tsx')) {
      let s = fs.readFileSync(p, 'utf8')
      const n = s
        .replace(/border border-primary bg-primary/g, 'border border-button bg-button')
        .replace(/\bborder-primary bg-primary\b/g, 'border-button bg-button')
        .replace(/bg-primary text-primary-foreground/g, 'bg-button text-button-foreground')
      if (n !== s) {
        fs.writeFileSync(p, n)
      }
    }
  }
}

walk(root)

/* Đồng bộ chữ trên nền nút */
const files = [
  'src/features/profile/components/MyProfileScreen/MyProfileScreen.tsx',
  'src/features/learning-path/components/ChecklistStarScreen/ChecklistStarScreen.tsx',
  'src/features/hr-admin/components/HrEmployeeProfile/HrEmployeeProfile.tsx',
  'src/features/hr-admin/components/HrEmployeeList/HrEmployeeList.tsx',
  'src/features/hr-admin/components/HrEmployeeList/EmployeeCard.tsx',
  'src/features/hr-admin/components/EmployeeForm/EmployeeForm.tsx',
  'src/features/exam/components/GraderPhanLopScreen/GraderPhanLopScreen.tsx',
  'src/features/exam/components/GraderExamListScreen/GraderExamListScreen.tsx',
  'src/features/exam/components/GraderChamThiScreen/GraderChamThiScreen.tsx',
  'src/features/employee-dashboard/EmployeeLearningDashboard.tsx',
  'src/features/bod/components/BodDashboardScreen/BodDashboardScreen.tsx',
  'src/app/routes/_auth/login.tsx',
]
const _root = path.join(__dirname, '..')
for (const rel of files) {
  const p = path.join(_root, rel)
  let s = fs.readFileSync(p, 'utf8')
  const n = s.replace(/text-primary-foreground/g, 'text-button-foreground')
  if (n !== s) fs.writeFileSync(p, n)
}
