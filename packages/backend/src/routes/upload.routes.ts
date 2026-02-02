import type { FastifyInstance } from 'fastify'
import { uploadController } from '../controllers/upload.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateParams } from '../middleware/validation.middleware.js'
import { imageIdSchema } from '../validators/upload.validators.js'

export async function uploadRoutes(fastify: FastifyInstance) {
  // All upload routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // Upload a new image (multipart/form-data)
  fastify.post('/image', uploadController.uploadImage.bind(uploadController))

  // Get all images for the authenticated user
  fastify.get('/images', uploadController.getUserImages.bind(uploadController))

  // Get a specific image by ID
  fastify.get(
    '/image/:id',
    { preHandler: [validateParams(imageIdSchema)] },
    uploadController.getImageById.bind(uploadController)
  )

  // Delete an image
  fastify.delete(
    '/image/:id',
    { preHandler: [validateParams(imageIdSchema)] },
    uploadController.deleteImage.bind(uploadController)
  )
}
