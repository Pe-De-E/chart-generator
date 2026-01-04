import type { FastifyInstance } from 'fastify'
import { chartController } from '../controllers/chart.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validation.middleware.js'
import {
  createChartSchema,
  updateChartSchema,
  chartIdSchema,
} from '../validators/chart.validators.js'

export async function chartRoutes(fastify: FastifyInstance) {
  // All chart routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // Create a new chart
  fastify.post(
    '/',
    { preHandler: [validateBody(createChartSchema)] },
    chartController.createChart.bind(chartController)
  )

  // Get all charts for the authenticated user
  fastify.get('/', chartController.getUserCharts.bind(chartController))

  // Get a specific chart by ID
  fastify.get(
    '/:id',
    { preHandler: [validateParams(chartIdSchema)] },
    chartController.getChartById.bind(chartController)
  )

  // Update a chart
  fastify.put(
    '/:id',
    {
      preHandler: [
        validateParams(chartIdSchema),
        validateBody(updateChartSchema),
      ],
    },
    chartController.updateChart.bind(chartController)
  )

  // Delete a chart
  fastify.delete(
    '/:id',
    { preHandler: [validateParams(chartIdSchema)] },
    chartController.deleteChart.bind(chartController)
  )
}
