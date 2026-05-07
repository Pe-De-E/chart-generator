import { Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { SYSTEM_ELEVATION_THEMES } from '../config/systemElevationThemes.js'
import type {
  CreateElevationThemeRequest,
  UpdateElevationThemeRequest,
  SavedElevationTheme,
  SystemElevationTheme,
  ElevationTheme,
} from '@chart-generator/shared'

export class ElevationThemeService {
  // Get all themes (system + user)
  async getAllThemes(userId: string): Promise<ElevationTheme[]> {
    const userThemes = await this.getUserThemes(userId)
    const systemThemes = this.getSystemThemes()

    return [...systemThemes, ...userThemes]
  }

  // Get system themes only
  getSystemThemes(): SystemElevationTheme[] {
    return SYSTEM_ELEVATION_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      preview: t.preview,
      tokens: t.tokens,
      isSystem: true as const,
    }))
  }

  // Get user themes only
  async getUserThemes(userId: string): Promise<SavedElevationTheme[]> {
    const themes = await prisma.elevationTheme.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return themes.map((t) => this.mapToSavedTheme(t))
  }

  // Get a specific theme by ID
  async getThemeById(themeId: string, userId: string): Promise<ElevationTheme | null> {
    // Check if it's a system theme
    if (themeId.startsWith('system-')) {
      const systemTheme = SYSTEM_ELEVATION_THEMES.find((t) => t.id === themeId)
      if (systemTheme) {
        return {
          id: systemTheme.id,
          name: systemTheme.name,
          description: systemTheme.description,
          preview: systemTheme.preview,
          tokens: systemTheme.tokens,
          isSystem: true as const,
        }
      }
      return null
    }

    // Otherwise, look for user theme
    const theme = await prisma.elevationTheme.findFirst({
      where: { id: themeId, userId },
    })

    return theme ? this.mapToSavedTheme(theme) : null
  }

  // Create a new user theme
  async createTheme(userId: string, data: CreateElevationThemeRequest): Promise<SavedElevationTheme> {
    const theme = await prisma.elevationTheme.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        preview: data.preview,
        tokens: data.tokens as Prisma.InputJsonValue,
      },
    })

    return this.mapToSavedTheme(theme)
  }

  // Update a user theme
  async updateTheme(
    themeId: string,
    userId: string,
    data: UpdateElevationThemeRequest
  ): Promise<SavedElevationTheme | null> {
    // Cannot update system themes
    if (themeId.startsWith('system-')) {
      return null
    }

    const existing = await prisma.elevationTheme.findFirst({
      where: { id: themeId, userId },
    })

    if (!existing) {
      return null
    }

    const theme = await prisma.elevationTheme.update({
      where: { id: themeId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.preview !== undefined && { preview: data.preview }),
        ...(data.tokens !== undefined && { tokens: data.tokens as Prisma.InputJsonValue }),
      },
    })

    return this.mapToSavedTheme(theme)
  }

  // Delete a user theme
  async deleteTheme(themeId: string, userId: string): Promise<boolean> {
    // Cannot delete system themes
    if (themeId.startsWith('system-')) {
      return false
    }

    const theme = await prisma.elevationTheme.findFirst({
      where: { id: themeId, userId },
    })

    if (!theme) {
      return false
    }

    await prisma.elevationTheme.delete({
      where: { id: themeId },
    })

    return true
  }

  private mapToSavedTheme(theme: any): SavedElevationTheme {
    return {
      id: theme.id,
      userId: theme.userId,
      name: theme.name,
      description: theme.description || undefined,
      preview: theme.preview,
      tokens: theme.tokens,
      createdAt: theme.createdAt.toISOString(),
      updatedAt: theme.updatedAt.toISOString(),
    }
  }
}

export const elevationThemeService = new ElevationThemeService()
