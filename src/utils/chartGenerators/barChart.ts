import type { ChartOptions } from './types'

export function generateBarChart({ data, colors, title }: ChartOptions): string {
  // Dynamic width based on data count to ensure bars are visible
  const minBarWidth = 8
  const baseWidth = 600
  const calculatedWidth = Math.max(baseWidth, data.length * minBarWidth * 1.2)
  const width = calculatedWidth
  const height = 400
  const margin = { top: 60, right: 40, bottom: 80, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const maxValue = Math.max(...data.map(d => d.value), 1) // Minimum 1 to avoid division by zero
  const barWidth = (chartWidth / data.length) * 0.8
  const barSpacing = chartWidth / data.length

  // Show every nth label based on data count to avoid overlap
  const labelInterval = data.length > 20 ? Math.ceil(data.length / 15) : 1
  const fontSize = data.length > 15 ? 9 : 10

  // Y-axis scale - calculate nice round numbers
  const yAxisSteps = 5
  const stepValue = Math.ceil(maxValue / yAxisSteps)
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = i * stepValue
    const y = margin.top + chartHeight - (value / maxValue) * chartHeight
    return { value, y }
  }).filter(item => item.value <= maxValue)

  const bars = data.map((d, i) => {
    const barHeight = (d.value / maxValue) * chartHeight
    const x = margin.left + i * barSpacing + (barSpacing - barWidth) / 2
    const y = margin.top + chartHeight - barHeight

    // Only show label for every nth item
    const showLabel = i % labelInterval === 0
    const labelX = x + barWidth/2
    const labelY = margin.top + chartHeight + 15

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
            fill="${colors.primary}" rx="4"/>
      ${showLabel ? `
        <text x="${labelX}" y="${labelY}"
              text-anchor="end" font-size="${fontSize}" fill="#4B5563"
              transform="rotate(-45 ${labelX} ${labelY})">${d.label}</text>
      ` : ''}
      ${data.length <= 15 ? `
        <text x="${x + barWidth/2}" y="${y - 5}"
              text-anchor="middle" font-size="10" font-weight="bold" fill="#1F2937">${d.value}</text>
      ` : ''}
    `
  }).join('')

  // Y-axis labels and grid lines
  const yAxis = yAxisLabels.map(({ value, y }) => `
    <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}"
          stroke="#9CA3AF" stroke-width="1"/>
    <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"
          stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
    <text x="${margin.left - 10}" y="${y + 4}"
          text-anchor="end" font-size="10" fill="#6B7280">${value}</text>
  `).join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20"
            font-weight="bold" fill="#1F2937">${title}</text>
      ${yAxis}
      ${bars}
      <line x1="${margin.left}" y1="${margin.top + chartHeight}"
            x2="${width - margin.right}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${margin.top + chartHeight}"
            stroke="#E5E7EB" stroke-width="2"/>
    </svg>
  `
}
