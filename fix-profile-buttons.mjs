import fs from 'node:fs'

const file = new URL('./src/features/hr-admin/components/HrEmployeeProfile/HrEmployeeProfile.tsx', import.meta.url)
let s = fs.readFileSync(file, 'utf8')

const deactStart = `            <button
              type="button"
              className="flex-1 rounded-[9px] border border-[#FCA5A5] bg-[#FEE2E2] py-2.5 text-sm font-bold text-[#991B1B] hover:bg-[#FECACA] disabled:opacity-50"
              disabled={!canDeactivate || isSaving}
              onClick={onDeactivate}
            >`

const i0 = s.indexOf(deactStart)
if (i0 === -1) throw new Error('deactivate button not found')
const i1 = s.indexOf('</button>', i0) + 9
const deactLabel = s
  .slice(i0, i1)
  .match(/>\s*([^<]+?)\s*</)[1]
  .trim()

const deactRep = `            <Button
              type="button"
              variant="destructive"
              className="flex-1 py-2.5 text-sm font-bold"
              disabled={!canDeactivate || isSaving}
              onClick={onDeactivate}
            >
              ${deactLabel}
            </Button>`
s = s.slice(0, i0) + deactRep + s.slice(i1)

const saveStart = `          <button
            type="button"
            className="flex-[2] rounded-lg border border-button bg-button py-2.5 text-sm font-bold text-button-foreground hover:opacity-90 disabled:opacity-50"
            disabled={!canEdit || isSaving}
            onClick={onSave}
          >`

const j0 = s.indexOf(saveStart)
if (j0 === -1) throw new Error('save button not found')
const j1 = s.indexOf('</button>', j0) + 9
const saveBody = s
  .slice(j0, j1)
  .replace(/^[\s\S]*?>/, '')
  .replace(/<\/button>\s*$/, '')
  .trim()

const saveRep = `          <Button
            type="button"
            className="flex-[2] py-2.5 text-sm font-bold"
            disabled={!canEdit || isSaving}
            onClick={onSave}
          >
            ${saveBody}
          </Button>`

s = s.slice(0, j0) + saveRep + s.slice(j1)

fs.writeFileSync(file, s)
