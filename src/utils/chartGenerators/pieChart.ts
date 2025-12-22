import type { ChartOptions } from './types'

export function generatePieChart({ data, colors, title }: ChartOptions): string {
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

    return `
      <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
            fill="${color}" stroke="${colors.background}" stroke-width="2"/>
      <text x="${labelX}" y="${labelY}" text-anchor="middle"
            font-size="12" font-weight="bold" fill="#FFFFFF">${d.label}</text>
      <text x="${labelX}" y="${labelY + 15}" text-anchor="middle"
            font-size="11" fill="#FFFFFF">${d.value}</text>
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
