import type { FastifyRequest, FastifyReply } from 'fastify'
import { elevationThemeService } from '../services/elevationTheme.service.js'
import type { CreateElevationThemeRequest, UpdateElevationThemeRequest } from '@chart-generator/shared'

export class ElevationThemeController {
  async getAllThemes(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.userId

    const themes = await elevationThemeService.getAllThemes(userId)

    return reply.send({
      success: true,
      data: themes,
    })
  }

  async getThemeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const themeId = request.params.id

    const theme = await elevationThemeService.getThemeById(themeId, userId)

    if (!theme) {
      return reply.code(404).send({
        success: false,
        error: 'Theme not found',
      })
    }

    return reply.send({
      success: true,
      data: theme,
    })
  }

  async createTheme(
    request: FastifyRequest<{ Body: CreateElevationThemeRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId

    const theme = await elevationThemeService.createTheme(userId, request.body)

    return reply.code(201).send({
      success: true,
      data: theme,
    })
  }

  async updateTheme(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateElevationThemeRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const themeId = request.params.id

    if (themeId.startsWith('system-')) {
      return reply.code(403).send({
        success: false,
        error: 'System themes cannot be modified',
      })
    }

    const theme = await elevationThemeService.updateTheme(themeId, userId, request.body)

    if (!theme) {
      return reply.code(404).send({
        success: false,
        error: 'Theme not found or access denied',
      })
    }

    return reply.send({
      success: true,
      data: theme,
    })
  }

  async deleteTheme(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const themeId = request.params.id

    if (themeId.startsWith('system-')) {
      return reply.code(403).send({
        success: false,
        error: 'System themes cannot be deleted',
      })
    }

    const deleted = await elevationThemeService.deleteTheme(themeId, userId)

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Theme not found or access denied',
      })
    }

    return reply.code(204).send()
  }
}

export const elevationThemeController = new ElevationThemeController()
