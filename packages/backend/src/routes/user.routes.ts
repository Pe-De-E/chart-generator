import { FastifyInstance } from 'fastify'
import { UserController } from '../controllers/user.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validation.middleware.js'
import { updateUserSchema, changePasswordSchema } from '../validators/user.validators.js'

export async function userRoutes(fastify: FastifyInstance) {
  // All user routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // GET /users/me
  fastify.get('/me', UserController.getCurrentUser)

  // PATCH /users/me
  fastify.patch(
    '/me',
    {
      preHandler: [validateBody(updateUserSchema)],
    },
    UserController.updateProfile
  )

  // PATCH /users/me/password
  fastify.patch(
    '/me/password',
    {
      preHandler: [validateBody(changePasswordSchema)],
    },
    UserController.changePassword
  )

  // DELETE /users/me
  fastify.delete('/me', UserController.deleteAccount)
}
