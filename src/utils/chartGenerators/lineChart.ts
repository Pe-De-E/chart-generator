import type { ChartOptions } from './types'

export function generateLineChart({ data, colors, title }: ChartOptions): string {
  const width = 600
  const height = 400
  const margin = { top: 60, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const maxValue = Math.max(...data.map(d => d.value))
  const xStep = chartWidth / (data.length - 1)

  const points = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - (d.value / maxValue) * chartHeight
    return `${x},${y}`
  }).join(' ')

  const circles = data.map((d, i) => {
    const x = margin.left + i * xStep
    const y = margin.top + chartHeight - (d.value / maxValue) * chartHeight
    return `
      <circle cx="${x}" cy="${y}" r="5" fill="${colors.secondary}"/>
      <text x="${x}" y="${margin.top + chartHeight + 20}"
            text-anchor="middle" font-size="12" fill="#4B5563">${d.label}</text>
      <text x="${x}" y="${y - 15}"
            text-anchor="middle" font-size="12" font-weight="bold" fill="#1F2937">${d.value}</text>
    `
  }).join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20"
            font-weight="bold" fill="#1F2937">${title}</text>
      <polyline points="${points}" fill="none" stroke="${colors.primary}"
                stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
    </svg>
  `
}
