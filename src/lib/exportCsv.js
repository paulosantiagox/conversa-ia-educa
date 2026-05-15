export function exportToCsv(data, filename) {
  if (!data || data.length === 0) return
  const keys = Object.keys(data[0])
  const header = keys.join(';')
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k] ?? ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(';') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }).join(';')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
