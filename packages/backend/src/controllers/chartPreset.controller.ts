import type { FastifyRequest, FastifyReply } from 'fastify'
import { chartPresetService } from '../services/chartPreset.service.js'
import type { CreateChartPresetRequest, UpdateChartPresetRequest } from '@chart-generator/shared'

export class ChartPresetController {
  async getAllPresets(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.userId

    const presets = await chartPresetService.getAllPresets(userId)

    return reply.send({
      success: true,
      data: presets,
    })
  }

  async getPresetById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const presetId = request.params.id

    const preset = await chartPresetService.getPresetById(presetId, userId)

    if (!preset) {
      return reply.code(404).send({
        success: false,
        error: 'Preset not found',
      })
    }

    return reply.send({
      success: true,
      data: preset,
    })
  }

  async createPreset(
    request: FastifyRequest<{ Body: CreateChartPresetRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId

    const preset = await chartPresetService.createPreset(userId, request.body)

    return reply.code(201).send({
      success: true,
      data: preset,
    })
  }

  async updatePreset(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateChartPresetRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const presetId = request.params.id

    if (presetId.startsWith('system-')) {
      return reply.code(403).send({
        success: false,
        error: 'System presets cannot be modified',
      })
    }

    const preset = await chartPresetService.updatePreset(presetId, userId, request.body)

    if (!preset) {
      return reply.code(404).send({
        success: false,
        error: 'Preset not found or access denied',
      })
    }

    return reply.send({
      success: true,
      data: preset,
    })
  }

  async deletePreset(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const presetId = request.params.id

    if (presetId.startsWith('system-')) {
      return reply.code(403).send({
        success: false,
        error: 'System presets cannot be deleted',
      })
    }

    const deleted = await chartPresetService.deletePreset(presetId, userId)

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Preset not found or access denied',
      })
    }

    return reply.code(204).send()
  }
}

export const chartPresetController = new ChartPresetController()
