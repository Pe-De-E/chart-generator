import { api } from './api.ts'
import type {
  SavedChart,
  CreateChartRequest,
  UpdateChartRequest,
} from '@chart-generator/shared'

class ChartService {
  async createChart(data: CreateChartRequest): Promise<SavedChart> {
    const response = await api.post<{ success: true; data: SavedChart }>(
      '/charts',
      data
    )
    return response.data.data
  }

  async getUserCharts(): Promise<SavedChart[]> {
    const response = await api.get<{ success: true; data: SavedChart[] }>(
      '/charts'
    )
    return response.data.data
  }

  async getChartById(id: string): Promise<SavedChart> {
    const response = await api.get<{ success: true; data: SavedChart }>(
      `/charts/${id}`
    )
    return response.data.data
  }

  async updateChart(id: string, data: UpdateChartRequest): Promise<SavedChart> {
    const response = await api.put<{ success: true; data: SavedChart }>(
      `/charts/${id}`,
      data
    )
    return response.data.data
  }

  async deleteChart(id: string): Promise<void> {
    await api.delete(`/charts/${id}`)
  }
}

export const chartService = new ChartService()
