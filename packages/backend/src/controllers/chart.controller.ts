import type { FastifyRequest, FastifyReply } from 'fastify'
import { chartService } from '../services/chart.service.js'
import type { CreateChartRequest, UpdateChartRequest } from '@chart-generator/shared'

export class ChartController {
  async createChart(
    request: FastifyRequest<{ Body: CreateChartRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId

    const chart = await chartService.createChart(userId, request.body)

    return reply.code(201).send({
      success: true,
      data: chart,
    })
  }

  async getUserCharts(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.userId

    const charts = await chartService.getUserCharts(userId)

    return reply.send({
      success: true,
      data: charts,
    })
  }

  async getChartById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const chartId = request.params.id

    const chart = await chartService.getChartById(chartId, userId)

    if (!chart) {
      return reply.code(404).send({
        success: false,
        error: 'Chart not found',
      })
    }

    return reply.send({
      success: true,
      data: chart,
    })
  }

  async updateChart(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateChartRequest }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const chartId = request.params.id

    const chart = await chartService.updateChart(chartId, userId, request.body)

    if (!chart) {
      return reply.code(404).send({
        success: false,
        error: 'Chart not found or access denied',
      })
    }

    return reply.send({
      success: true,
      data: chart,
    })
  }

  async deleteChart(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const chartId = request.params.id

    const deleted = await chartService.deleteChart(chartId, userId)

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Chart not found or access denied',
      })
    }

    return reply.code(204).send()
  }
}

export const chartController = new ChartController()
