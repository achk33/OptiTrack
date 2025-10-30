import ExcelJS from 'exceljs'
import { Response } from 'express'

export interface ExportColumn {
  header: string
  key: string
  width?: number
}

export async function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  fileName: string,
  res: Response
) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Data')

  // Set columns
  worksheet.columns = columns

  // Style header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  }
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true }

  // Add data rows
  data.forEach((item) => {
    worksheet.addRow(item)
  })

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (!column.width) {
      let maxLength = 10
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = Math.min(maxLength + 2, 50)
    }
  })

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

  // Write to response
  await workbook.xlsx.write(res)
  res.end()
}

export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  fileName: string,
  res: Response
) {
  // Create CSV header
  const header = columns.map((col) => col.header).join(',')

  // Create CSV rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = item[col.key]
        // Escape commas and quotes
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(',')
  })

  // Combine header and rows
  const csv = [header, ...rows].join('\n')

  // Set response headers
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

  // Add BOM for Excel compatibility
  res.write('\uFEFF')
  res.write(csv)
  res.end()
}
