import type { FastifyInstance } from 'fastify'
import { elevationThemeController } from '../controllers/elevationTheme.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateBody, validateParams } from '../middleware/validation.middleware.js'
import {
  createElevationThemeSchema,
  updateElevationThemeSchema,
  themeIdSchema,
} from '../validators/elevationTheme.validators.js'

export async function elevationThemeRoutes(fastify: FastifyInstance) {
  // All theme routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // Get all themes (system + user)
  fastify.get('/', elevationThemeController.getAllThemes.bind(elevationThemeController))

  // Get a specific theme by ID
  fastify.get(
    '/:id',
    { preHandler: [validateParams(themeIdSchema)] },
    elevationThemeController.getThemeById.bind(elevationThemeController)
  )

  // Create a new user theme
  fastify.post(
    '/',
    { preHandler: [validateBody(createElevationThemeSchema)] },
    elevationThemeController.createTheme.bind(elevationThemeController)
  )

  // Update a user theme
  fastify.put(
    '/:id',
    {
      preHandler: [
        validateParams(themeIdSchema),
        validateBody(updateElevationThemeSchema),
      ],
    },
    elevationThemeController.updateTheme.bind(elevationThemeController)
  )

  // Delete a user theme
  fastify.delete(
    '/:id',
    { preHandler: [validateParams(themeIdSchema)] },
    elevationThemeController.deleteTheme.bind(elevationThemeController)
  )
}
