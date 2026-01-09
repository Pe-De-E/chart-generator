import { FastifyInstance } from 'fastify'
import { AdminController } from '../controllers/admin.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { adminMiddleware } from '../middleware/admin.middleware.js'

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication + admin authorization
  fastify.addHook('preHandler', authMiddleware)
  fastify.addHook('preHandler', adminMiddleware)

  // Dashboard
  fastify.get('/dashboard', AdminController.getDashboardOverview)

  // Users
  fastify.get('/users', AdminController.getUsers)
  fastify.get('/users/stats', AdminController.getUserStats)

  // Payments
  fastify.get('/payments', AdminController.getPayments)
  fastify.get('/payments/stats', AdminController.getPaymentStats)

  // Request Logs
  fastify.get('/requests', AdminController.getRequestLogs)
  fastify.get('/requests/stats', AdminController.getRequestStats)

  // Error Logs
  fastify.get('/errors', AdminController.getErrorLogs)
  fastify.get('/errors/stats', AdminController.getErrorStats)
  fastify.patch('/errors/:errorId/resolve', AdminController.resolveError)
}
