const XLSX = require('xlsx')

const wb = XLSX.utils.book_new()

// ── Sheet 1: Import Sheet ──
const ws = {}

// Headers
const headers = ['full_name', 'role', 'class', 'email', 'username', 'password']
headers.forEach((h, i) => {
  ws[String.fromCharCode(65 + i) + '1'] = { v: h, t: 's' }
})

// Rows 2-201 with formulas
for (let r = 2; r <= 201; r++) {
  const row = String(r)

  // username: teacher → meenagupta, student → rahulsharma@class5narmada
  const userF = [
    'IF(B' + row + '="teacher",',
    'LOWER(SUBSTITUTE(A' + row + '," ","")),',
    'LOWER(SUBSTITUTE(A' + row + '," ",""))&"@"&',
    'LOWER(SUBSTITUTE(SUBSTITUTE(C' + row + '," - ","")," ","")))',
  ].join('')

  // password: teacher → MeenaGupta@jbm, student → RahulSharma@Class5Narmada
  const passF = [
    'IF(B' + row + '="teacher",',
    'SUBSTITUTE(PROPER(A' + row + ')," ","")&"@jbm",',
    'SUBSTITUTE(PROPER(A' + row + ')," ","")&"@"&',
    'SUBSTITUTE(SUBSTITUTE(C' + row + '," - ","")," ",""))',
  ].join('')

  ws['E' + row] = { t: 's', f: userF }
  ws['F' + row] = { t: 's', f: passF }
}

ws['!ref'] = 'A1:F201'
ws['!cols'] = [
  { wch: 24 }, // full_name
  { wch: 10 }, // role
  { wch: 22 }, // class
  { wch: 26 }, // email
  { wch: 30 }, // username (auto)
  { wch: 30 }, // password (auto)
]

XLSX.utils.book_append_sheet(wb, ws, 'Import')

// ── Sheet 2: Class Names Reference ──
const classNames = [
  ['Valid Class Names — copy-paste exactly into the "class" column'],
  ['Nursery - Narmada'], ['Nursery - Kaveri'], ['Nursery - Indus'],
  ['Prep - Narmada'],    ['Prep - Kaveri'],    ['Prep - Indus'],
  ['Class 1 - Narmada'], ['Class 1 - Kaveri'], ['Class 1 - Indus'],
  ['Class 2 - Narmada'], ['Class 2 - Kaveri'], ['Class 2 - Indus'],
  ['Class 3 - Narmada'], ['Class 3 - Kaveri'], ['Class 3 - Indus'],
  ['Class 4 - Narmada'], ['Class 4 - Kaveri'], ['Class 4 - Indus'],
  ['Class 5 - Narmada'], ['Class 5 - Kaveri'], ['Class 5 - Indus'],
  ['Class 6 - Narmada'], ['Class 6 - Kaveri'], ['Class 6 - Indus'],
  ['Class 7 - Narmada'], ['Class 7 - Kaveri'], ['Class 7 - Indus'],
  ['Class 8 - Narmada'], ['Class 8 - Kaveri'], ['Class 8 - Indus'],
  ['Class 9 - Narmada'], ['Class 9 - Kaveri'], ['Class 9 - Indus'],
  ['Class 10 - Narmada'], ['Class 10 - Kaveri'], ['Class 10 - Indus'],
  ['Class 11 - Narmada'], ['Class 11 - Kaveri'], ['Class 11 - Indus'],
  ['Class 12 - Narmada'], ['Class 12 - Kaveri'], ['Class 12 - Indus'],
]
const ref = XLSX.utils.aoa_to_sheet(classNames)
ref['!cols'] = [{ wch: 32 }]
XLSX.utils.book_append_sheet(wb, ref, 'Class Names')

XLSX.writeFile(wb, 'C:/Users/HP/Desktop/JBM_Bulk_Import_Template.xlsx')
console.log('Template saved to Desktop!')
