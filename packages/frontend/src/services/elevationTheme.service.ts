import { api } from './api'
import type {
  ElevationTheme,
  SavedElevationTheme,
  CreateElevationThemeRequest,
  UpdateElevationThemeRequest,
} from '@chart-generator/shared'

class ElevationThemeService {
  async getAllThemes(): Promise<ElevationTheme[]> {
    const response = await api.get<{ success: true; data: ElevationTheme[] }>(
      '/elevation-themes'
    )
    return response.data.data
  }

  async getThemeById(id: string): Promise<ElevationTheme> {
    const response = await api.get<{ success: true; data: ElevationTheme }>(
      `/elevation-themes/${id}`
    )
    return response.data.data
  }

  async createTheme(data: CreateElevationThemeRequest): Promise<SavedElevationTheme> {
    const response = await api.post<{ success: true; data: SavedElevationTheme }>(
      '/elevation-themes',
      data
    )
    return response.data.data
  }

  async updateTheme(id: string, data: UpdateElevationThemeRequest): Promise<SavedElevationTheme> {
    const response = await api.put<{ success: true; data: SavedElevationTheme }>(
      `/elevation-themes/${id}`,
      data
    )
    return response.data.data
  }

  async deleteTheme(id: string): Promise<void> {
    await api.delete(`/elevation-themes/${id}`)
  }
}

export const elevationThemeService = new ElevationThemeService()
