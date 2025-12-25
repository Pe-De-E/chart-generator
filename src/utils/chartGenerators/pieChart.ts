import type { ChartOptions } from './types'

export function generatePieChart(options: ChartOptions): string {
  const { data, seriesData, seriesConfig, colors, title } = options

  // Check if multi-series mode
  if (seriesData && seriesConfig && seriesConfig.length > 1) {
    // Multi-series not supported for pie charts
    return `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" fill="${colors.background}"/>
        <text x="300" y="180" text-anchor="middle" font-size="18" fill="#1F2937">
          Pie Chart unterstützt keine mehreren Serien
        </text>
        <text x="300" y="210" text-anchor="middle" font-size="14" fill="#6B7280">
          Bitte wählen Sie einen anderen Chart-Typ oder reduzieren Sie auf eine Serie
        </text>
      </svg>
    `
  }

  if (!data) {
    return `<svg width="600" height="400"><text x="300" y="200" text-anchor="middle">No data</text></svg>`
  }

  return generateSingleSeriesPie(data, colors, title)
}

function generateSingleSeriesPie(
  data: Array<{ label: string, value: number }>,
  colors: { background: string },
  title: string
): string {
  const width = 600
  const height = 400
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3

  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = -Math.PI / 2

  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArc = sliceAngle > Math.PI ? 1 : 0

    const labelAngle = startAngle + sliceAngle / 2
    const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle)
    const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle)

    const hue = (i * 360 / data.length) % 360
    const color = `hsl(${hue}, 70%, 60%)`

    currentAngle = endAngle

    // Only show labels for slices that are large enough (> 3% of total)
    const percentage = (d.value / total) * 100
    const showLabel = percentage > 3 && data.length <= 20

    return `
      <path d="M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z"
            fill="${color}" stroke="${colors.background}" stroke-width="1"/>
      ${showLabel ? `
        <text x="${labelX}" y="${labelY}" text-anchor="middle"
              font-size="12" font-weight="bold" fill="#FFFFFF">${d.label}</text>
        <text x="${labelX}" y="${labelY + 15}" text-anchor="middle"
              font-size="11" fill="#FFFFFF">${d.value}</text>
      ` : ''}
    `
  }).join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-size="20"
            font-weight="bold" fill="#1F2937">${title}</text>
      ${slices}
    </svg>
  `
}
