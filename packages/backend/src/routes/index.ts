import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes.js'
import { userRoutes } from './user.routes.js'

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // API v1 routes
  await fastify.register(async (api) => {
    await api.register(authRoutes, { prefix: '/auth' })
    await api.register(userRoutes, { prefix: '/users' })
  }, { prefix: '/api/v1' })
}
