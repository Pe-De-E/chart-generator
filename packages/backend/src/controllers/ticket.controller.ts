import { FastifyRequest, FastifyReply } from 'fastify'
import { TicketService } from '../services/ticket.service.js'
import { TicketType, TicketStatus } from '@prisma/client'

interface AuthenticatedRequest extends FastifyRequest {
  user: { userId: string; email: string }
}

export class TicketController {
  // Create ticket (authenticated user)
  static async createTicket(
    request: FastifyRequest<{
      Body: { subject: string; message: string; type: TicketType }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user
      const { subject, message, type } = request.body

      const ticket = await TicketService.createTicket({
        userId,
        subject,
        message,
        type: type || 'QUESTION',
      })

      return reply.status(201).send({ success: true, data: ticket })
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 },
      })
    }
  }

  // Get user's own tickets
  static async getUserTickets(
    request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user
      const { page = '1', pageSize = '20' } = request.query

      const result = await TicketService.getUserTickets(userId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      })

      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 },
      })
    }
  }

  // Admin: Get all tickets
  static async getTickets(
    request: FastifyRequest<{
      Querystring: { page?: string; pageSize?: string; status?: string; type?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { page = '1', pageSize = '20', status, type } = request.query
      const result = await TicketService.getTickets({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        status: status as TicketStatus | undefined,
        type: type as TicketType | undefined,
      })

      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 },
      })
    }
  }

  // Admin: Update ticket status
  static async updateTicketStatus(
    request: FastifyRequest<{
      Params: { ticketId: string }
      Body: { status: TicketStatus; adminNotes?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ticketId } = request.params
      const { status, adminNotes } = request.body
      const { userId } = (request as AuthenticatedRequest).user

      const ticket = await TicketService.updateTicketStatus(ticketId, {
        status,
        adminNotes,
        resolvedBy: userId,
      })

      return reply.status(200).send({ success: true, data: ticket })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Ticket nicht gefunden', statusCode: 404 },
        })
      }
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 },
      })
    }
  }

  // Admin: Get ticket stats
  static async getTicketStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await TicketService.getTicketStats()
      return reply.status(200).send(stats)
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 },
      })
    }
  }
}
