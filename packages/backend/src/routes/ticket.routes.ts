import { FastifyInstance } from 'fastify'
import { TicketController } from '../controllers/ticket.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { adminMiddleware } from '../middleware/admin.middleware.js'

export async function ticketRoutes(fastify: FastifyInstance) {
  // All ticket routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // User routes (authenticated users)
  fastify.post('/', TicketController.createTicket)
  fastify.get('/my', TicketController.getUserTickets)

  // Admin routes (require admin middleware)
  fastify.register(async (adminApi) => {
    adminApi.addHook('preHandler', adminMiddleware)

    adminApi.get('/', TicketController.getTickets)
    adminApi.get('/stats', TicketController.getTicketStats)
    adminApi.patch('/:ticketId/status', TicketController.updateTicketStatus)
  })
}
