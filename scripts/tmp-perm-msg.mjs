import fs from 'node:fs';

const p = 'd:/HRM_VCB/HRM/src/app/routes/_protected/permissions/index.tsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const msg =
  "Kh\u00f4ng c\u00f3 nh\u00e2n vi\u00ean kh\u1edbp t\u00ecm ki\u1ebfm ho\u1eb7c b\u1ed9 l\u1ecdc vai tr\u00f2.";
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('? ') && lines[i].includes('Kh') && lines[i].includes('tìm kiếm')) {
    lines[i] = `                          ? '${msg}'`;
    break;
  }
}
fs.writeFileSync(p, lines.join('\n'));
