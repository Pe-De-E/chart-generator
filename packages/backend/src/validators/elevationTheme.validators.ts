import { z } from 'zod'

const easingTypeSchema = z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
const backgroundTypeSchema = z.enum(['solid', 'gradient', 'mesh'])

const elevationThemeTokensSchema = z.object({
  curve: z.object({
    color: z.string(),
    strokeWidth: z.number(),
  }),
  marker: z.object({
    size: z.number(),
    color: z.string(),
    show: z.boolean(),
  }),
  background: z.object({
    type: backgroundTypeSchema,
    color: z.string(),
    gradientColor: z.string(),
    meshColors: z.tuple([z.string(), z.string(), z.string()]),
  }),
  labels: z.object({
    elevationColor: z.string(),
    distanceColor: z.string(),
    showElevation: z.boolean(),
    showDistance: z.boolean(),
  }),
  pattern: z.object({
    color: z.string(),
    opacity: z.number(),
  }),
  animation: z.object({
    duration: z.number(),
    easing: easingTypeSchema,
  }),
})

export const createElevationThemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  preview: z.string().min(1),
  tokens: elevationThemeTokensSchema,
})

export const updateElevationThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  preview: z.string().min(1).optional(),
  tokens: elevationThemeTokensSchema.optional(),
})

// Theme ID can be UUID (user theme) or 'system-*' (system theme)
export const themeIdSchema = z.object({
  id: z.string().min(1),
})
