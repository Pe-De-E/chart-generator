import type { FastifyInstance } from 'fastify'
import { chartController } from '../controllers/chart.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validation.middleware.js'
import {
  createChartSchema,
  updateChartSchema,
  chartIdSchema,
} from '../validators/chart.validators.js'

export async function chartRoutes(fastify: FastifyInstance) {
  // All chart routes require authentication
  fastify.addHook('onRequest', authenticate)

  // Create a new chart
  fastify.post(
    '/',
    { preHandler: validate(createChartSchema) },
    chartController.createChart.bind(chartController)
  )

  // Get all charts for the authenticated user
  fastify.get('/', chartController.getUserCharts.bind(chartController))

  // Get a specific chart by ID
  fastify.get(
    '/:id',
    { preHandler: validate(chartIdSchema, 'params') },
    chartController.getChartById.bind(chartController)
  )

  // Update a chart
  fastify.put(
    '/:id',
    {
      preHandler: [
        validate(chartIdSchema, 'params'),
        validate(updateChartSchema),
      ],
    },
    chartController.updateChart.bind(chartController)
  )

  // Delete a chart
  fastify.delete(
    '/:id',
    { preHandler: validate(chartIdSchema, 'params') },
    chartController.deleteChart.bind(chartController)
  )
}
