import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes.js'
import { userRoutes } from './user.routes.js'
import { chartRoutes } from './chart.routes.js'
import { adminRoutes } from './admin.routes.js'
import { ticketRoutes } from './ticket.routes.js'

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
    await api.register(chartRoutes, { prefix: '/charts' })
    await api.register(adminRoutes, { prefix: '/admin' })
    await api.register(ticketRoutes, { prefix: '/tickets' })
  }, { prefix: '/api/v1' })
}
