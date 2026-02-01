import { z } from 'zod'

const statisticalOverlayColorsSchema = z.object({
  mean: z.string(),
  median: z.string(),
  stdDev: z.string(),
  minMax: z.string(),
  quartiles: z.string(),
  customRange: z.string(),
  zScore: z.string(),
})

const statisticalOverlaysSchema = z.object({
  showMean: z.boolean(),
  showMedian: z.boolean(),
  showStdDev: z.boolean(),
  showMinMax: z.boolean(),
  showQuartiles: z.boolean(),
  showCustomRange: z.boolean(),
  customRangeMin: z.number(),
  customRangeMax: z.number(),
  showZScore: z.boolean(),
  zScoreThreshold: z.number(),
  color: z.string(),
  colors: statisticalOverlayColorsSchema,
})

const presetColorsSchema = z.object({
  background: z.string(),
  series: z.array(z.string()),
})

const chartTypeSchema = z.enum(['bar', 'line', 'scatter', 'pie', 'area', 'elevation'])

const presetConfigSchema = z.object({
  chartType: chartTypeSchema.optional(),  // Optional: for filtering presets by chart type
  colors: presetColorsSchema,
  statisticalOverlays: statisticalOverlaysSchema,
  styleOverrides: z.record(z.unknown()).optional(),
})

export const createChartPresetSchema = z.object({
  name: z.string().min(1).max(100),
  config: presetConfigSchema,
})

export const updateChartPresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: presetConfigSchema.optional(),
})

// Preset ID can be UUID (user preset) or 'system-*' (system preset)
export const presetIdSchema = z.object({
  id: z.string().min(1),
})
