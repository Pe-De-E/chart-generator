import { Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { SYSTEM_CHART_PRESETS } from '../config/systemChartPresets.js'
import type {
  CreateChartPresetRequest,
  UpdateChartPresetRequest,
  SavedChartPreset,
  SystemChartPreset,
  ChartPreset,
} from '@chart-generator/shared'

export class ChartPresetService {
  // Get all presets (system + user)
  async getAllPresets(userId: string): Promise<ChartPreset[]> {
    const userPresets = await this.getUserPresets(userId)
    const systemPresets = this.getSystemPresets()

    return [...systemPresets, ...userPresets]
  }

  // Get system presets only
  getSystemPresets(): SystemChartPreset[] {
    return SYSTEM_CHART_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      config: p.config,
      isSystem: true as const,
    }))
  }

  // Get user presets only
  async getUserPresets(userId: string): Promise<SavedChartPreset[]> {
    const presets = await prisma.chartPreset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return presets.map((p) => this.mapToSavedPreset(p))
  }

  // Get a specific preset by ID
  async getPresetById(presetId: string, userId: string): Promise<ChartPreset | null> {
    // Check if it's a system preset
    if (presetId.startsWith('system-')) {
      const systemPreset = SYSTEM_CHART_PRESETS.find((p) => p.id === presetId)
      if (systemPreset) {
        return {
          id: systemPreset.id,
          name: systemPreset.name,
          config: systemPreset.config,
          isSystem: true as const,
        }
      }
      return null
    }

    // Otherwise, look for user preset
    const preset = await prisma.chartPreset.findFirst({
      where: { id: presetId, userId },
    })

    return preset ? this.mapToSavedPreset(preset) : null
  }

  // Create a new user preset
  async createPreset(userId: string, data: CreateChartPresetRequest): Promise<SavedChartPreset> {
    const preset = await prisma.chartPreset.create({
      data: {
        userId,
        name: data.name,
        config: data.config as Prisma.InputJsonValue,
      },
    })

    return this.mapToSavedPreset(preset)
  }

  // Update a user preset
  async updatePreset(
    presetId: string,
    userId: string,
    data: UpdateChartPresetRequest
  ): Promise<SavedChartPreset | null> {
    // Cannot update system presets
    if (presetId.startsWith('system-')) {
      return null
    }

    const existing = await prisma.chartPreset.findFirst({
      where: { id: presetId, userId },
    })

    if (!existing) {
      return null
    }

    const preset = await prisma.chartPreset.update({
      where: { id: presetId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.config !== undefined && { config: data.config as Prisma.InputJsonValue }),
      },
    })

    return this.mapToSavedPreset(preset)
  }

  // Delete a user preset
  async deletePreset(presetId: string, userId: string): Promise<boolean> {
    // Cannot delete system presets
    if (presetId.startsWith('system-')) {
      return false
    }

    const preset = await prisma.chartPreset.findFirst({
      where: { id: presetId, userId },
    })

    if (!preset) {
      return false
    }

    await prisma.chartPreset.delete({
      where: { id: presetId },
    })

    return true
  }

  private mapToSavedPreset(preset: any): SavedChartPreset {
    return {
      id: preset.id,
      userId: preset.userId,
      name: preset.name,
      config: preset.config,
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
    }
  }
}

export const chartPresetService = new ChartPresetService()
