import fs from 'node:fs'

const file = new URL('./src/features/hr-admin/components/HrEmployeeProfile/HrEmployeeProfile.tsx', import.meta.url)
let s = fs.readFileSync(file, 'utf8')

function replaceBetween(start, end, insert) {
  const i = s.indexOf(start)
  const j = s.indexOf(end)
  if (i === -1 || j === -1 || j <= i) throw new Error(`markers missing: ${start.slice(0, 40)}`)
  s = s.slice(0, i) + insert + s.slice(j)
}

/* --- Toolbar (lg) --- */
const tbStart = '          <div className="mb-4 hidden flex-wrap items-center justify-end gap-2 lg:flex">\n'
const tbEnd =
  '          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-[var(--shadow-card)] ring-1 ring-primary/5">\n'
const tbOld = s.slice(s.indexOf(tbStart), s.indexOf(tbEnd))
const tbActions = [...tbOld.matchAll(/onClick=\{onDemoAction\('([^']*)'\)\}/g)].map((m) => m[1])
const tbLabels = [...tbOld.matchAll(/>\s*([^<]+?)\s*<\/button>/g)].map((m) => m[1].trim())
if (tbActions.length !== 4 || tbLabels.length !== 4) throw new Error('toolbar parse')
const tbNew = `          <div className="mb-4 hidden flex-wrap items-center justify-end gap-2 lg:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDemoAction('${tbActions[0]}')}
            >
              ${tbLabels[0]}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDemoAction('${tbActions[1]}')}
            >
              ${tbLabels[1]}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDemoAction('${tbActions[2]}')}
            >
              ${tbLabels[2]}
            </Button>
            <Button type="button" size="sm" onClick={onDemoAction('${tbActions[3]}')}>
              ${tbLabels[3]}
            </Button>
          </div>

`
replaceBetween(tbStart, tbEnd, tbNew)

/* --- Mobile aside buttons --- */
const mbStart = '            <div className="flex flex-wrap items-center gap-1.5 lg:hidden">\n'
const mbEnd = '            </div>\n          </div>\n\n          <div className="flex flex-col gap-6 rounded-2xl'
const mbOld = s.slice(s.indexOf(mbStart), s.indexOf(mbEnd))
const mbActions = [...mbOld.matchAll(/onClick=\{onDemoAction\('([^']*)'\)\}/g)].map((m) => m[1])
const mbLabels = [...mbOld.matchAll(/>\s*([^<]+?)\s*<\/button>/g)].map((m) => m[1].trim())
if (mbActions.length !== 2 || mbLabels.length !== 2) throw new Error('mobile parse')
const mbNew = `            <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={onDemoAction('${mbActions[0]}')}
              >
                ${mbLabels[0]}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={onDemoAction('${mbActions[1]}')}
              >
                ${mbLabels[1]}
              </Button>
            </div>
          </div>

`
replaceBetween(mbStart, mbEnd, mbNew)

/* --- Hero CTA --- */
const hStart = '              <div className="mt-5 flex flex-wrap items-center gap-2">\n'
const hEnd = '              </div>\n            </div>\n\n            <nav\n'
const hOld = s.slice(s.indexOf(hStart), s.indexOf(hEnd))
const heroLabel = hOld.match(/onClick=\{\(\) => setTab\(4\)\}[\s\S]*?>\s*([^<]+?)\s*</)?.[1]?.trim()
if (!heroLabel) throw new Error('hero label')
const heroNew = `              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="button" className="gap-2" onClick={() => setTab(4)}>
                  ${heroLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => toast.info('Cài đặt nhân viên (demo)')}
                  aria-label="Cài đặt"
                >
                  <Settings className="h-5 w-5" strokeWidth={2} />
                </Button>
              </div>
            </div>

`
replaceBetween(hStart, hEnd, heroNew)

fs.writeFileSync(file, s)
