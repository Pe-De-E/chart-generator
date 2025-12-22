export interface DataPoint {
  label: string
  value: number
}

export interface ChartColors {
  primary: string
  secondary?: string
  background: string
}

export interface ChartOptions {
  data: DataPoint[]
  colors: ChartColors
  title: string
}
