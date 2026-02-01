import { api } from './api'
import type {
  ChartPreset,
  SavedChartPreset,
  CreateChartPresetRequest,
  UpdateChartPresetRequest,
} from '@chart-generator/shared'

class ChartPresetService {
  async getAllPresets(): Promise<ChartPreset[]> {
    const response = await api.get<{ success: true; data: ChartPreset[] }>(
      '/chart-presets'
    )
    return response.data.data
  }

  async getPresetById(id: string): Promise<ChartPreset> {
    const response = await api.get<{ success: true; data: ChartPreset }>(
      `/chart-presets/${id}`
    )
    return response.data.data
  }

  async createPreset(data: CreateChartPresetRequest): Promise<SavedChartPreset> {
    const response = await api.post<{ success: true; data: SavedChartPreset }>(
      '/chart-presets',
      data
    )
    return response.data.data
  }

  async updatePreset(id: string, data: UpdateChartPresetRequest): Promise<SavedChartPreset> {
    const response = await api.put<{ success: true; data: SavedChartPreset }>(
      `/chart-presets/${id}`,
      data
    )
    return response.data.data
  }

  async deletePreset(id: string): Promise<void> {
    await api.delete(`/chart-presets/${id}`)
  }
}

export const chartPresetService = new ChartPresetService()
