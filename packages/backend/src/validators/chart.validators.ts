import { z } from 'zod'

const chartTypeSchema = z.enum(['bar', 'line', 'scatter', 'pie', 'area', 'elevation'])

export const createChartSchema = z.object({
  title: z.string().min(1).max(255),
  type: chartTypeSchema,
  data: z.record(z.unknown()),
  config: z.record(z.unknown()),
  svgContent: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const updateChartSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: chartTypeSchema.optional(),
  data: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  svgContent: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const chartIdSchema = z.object({
  id: z.string().uuid(),
})
