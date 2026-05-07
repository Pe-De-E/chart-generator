import { Prisma } from '@prisma/client'
import type { Chart } from '@prisma/client'
import { prisma } from '../config/database.js'
import type { CreateChartRequest, UpdateChartRequest, SavedChart } from '@chart-generator/shared'

export class ChartService {
  async createChart(userId: string, data: CreateChartRequest): Promise<SavedChart> {
    const chart = await prisma.chart.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        data: data.data as Prisma.InputJsonValue,
        config: data.config as Prisma.InputJsonValue,
        svgContent: data.svgContent || null,
        isPublic: data.isPublic || false,
      },
    })

    return this.mapToSavedChart(chart)
  }

  async getUserCharts(userId: string): Promise<SavedChart[]> {
    const charts = await prisma.chart.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return charts.map((chart) => this.mapToSavedChart(chart))
  }

  async getChartById(chartId: string, userId: string): Promise<SavedChart | null> {
    const chart = await prisma.chart.findFirst({
      where: {
        id: chartId,
        OR: [{ userId }, { isPublic: true }],
      },
    })

    if (!chart) {
      return null
    }

    return this.mapToSavedChart(chart)
  }

  async updateChart(
    chartId: string,
    userId: string,
    data: UpdateChartRequest
  ): Promise<SavedChart | null> {
    // Check if chart exists and belongs to user
    const existingChart = await prisma.chart.findFirst({
      where: { id: chartId, userId },
    })

    if (!existingChart) {
      return null
    }

    const chart = await prisma.chart.update({
      where: { id: chartId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.data !== undefined && { data: data.data as Prisma.InputJsonValue }),
        ...(data.config !== undefined && { config: data.config as Prisma.InputJsonValue }),
        ...(data.svgContent !== undefined && { svgContent: data.svgContent }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      },
    })

    return this.mapToSavedChart(chart)
  }

  async deleteChart(chartId: string, userId: string): Promise<boolean> {
    const chart = await prisma.chart.findFirst({
      where: { id: chartId, userId },
    })

    if (!chart) {
      return false
    }

    await prisma.chart.delete({
      where: { id: chartId },
    })

    return true
  }

  private mapToSavedChart(chart: Chart): SavedChart {
    return {
      id: chart.id,
      userId: chart.userId,
      title: chart.title,
      type: chart.type,
      data: chart.data,
      config: chart.config,
      svgContent: chart.svgContent,
      isPublic: chart.isPublic,
      createdAt: chart.createdAt.toISOString(),
      updatedAt: chart.updatedAt.toISOString(),
    }
  }
}

export const chartService = new ChartService()
