import { FastifyInstance } from 'fastify'
import { AuthController } from '../controllers/auth.controller.js'
import { validateBody } from '../middleware/validation.middleware.js'
import { signupSchema, loginSchema } from '../validators/auth.validators.js'

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/signup
  fastify.post(
    '/signup',
    {
      preHandler: [validateBody(signupSchema)],
    },
    AuthController.signup
  )

  // POST /auth/login
  fastify.post(
    '/login',
    {
      preHandler: [validateBody(loginSchema)],
    },
    AuthController.login
  )

  // POST /auth/logout
  fastify.post('/logout', AuthController.logout)

  // POST /auth/refresh
  fastify.post('/refresh', AuthController.refresh)
}
