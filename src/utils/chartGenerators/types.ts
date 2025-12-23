export interface DataPoint {
  label: string
  value: number
  // Additional columns stored as key-value pairs
  [key: string]: string | number
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
