import type { FastifyInstance } from 'fastify'
import { chartPresetController } from '../controllers/chartPreset.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validation.middleware.js'
import {
  createChartPresetSchema,
  updateChartPresetSchema,
  presetIdSchema,
} from '../validators/chartPreset.validators.js'

export async function chartPresetRoutes(fastify: FastifyInstance) {
  // All preset routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // Get all presets (system + user)
  fastify.get('/', chartPresetController.getAllPresets.bind(chartPresetController))

  // Get a specific preset by ID
  fastify.get(
    '/:id',
    { preHandler: [validateParams(presetIdSchema)] },
    chartPresetController.getPresetById.bind(chartPresetController)
  )

  // Create a new user preset
  fastify.post(
    '/',
    { preHandler: [validateBody(createChartPresetSchema)] },
    chartPresetController.createPreset.bind(chartPresetController)
  )

  // Update a user preset
  fastify.put(
    '/:id',
    {
      preHandler: [
        validateParams(presetIdSchema),
        validateBody(updateChartPresetSchema),
      ],
    },
    chartPresetController.updatePreset.bind(chartPresetController)
  )

  // Delete a user preset
  fastify.delete(
    '/:id',
    { preHandler: [validateParams(presetIdSchema)] },
    chartPresetController.deletePreset.bind(chartPresetController)
  )
}
